// Import required functions
import { decryptMessage, generateKeyPair, importPrivateKeyFromBase64 } from "./encryption";
import { arrayBufferToString, base64ToArrayBuffer, isValidJson } from "./utils"
import * as Firestore from 'fireworkers';

// Small function to create a Response object
function makeResponse(request, status, cookieData, data) {
    if(!cookieData.set) {
        return new Response(`${data}`, {
            status: status,
            headers: { 
                "content-type": "text/plain",
                "Access-Control-Allow-Origin" : request.headers.get('Origin'),
                "Access-Control-Allow-Headers": "Content-Type, Set-Cookie",
                "Access-Control-Allow-Credentials": "true"
            },
        })
    } else {
        return new Response(`${data}`, {
            status: status,
            headers: { 
                "content-type": "text/plain",
                "Set-Cookie": `${cookieData.name}=${cookieData.value}; Max-Age=${cookieData.age == undefined ? 86400 : cookieData.age}; Secure; HttpOnly`,
                "Access-Control-Allow-Origin" : request.headers.get('Origin'),
                "Access-Control-Allow-Headers": "Content-Type, Set-Cookie",
                "Access-Control-Allow-Credentials": "true"
            },
        })
    }
}

// Helper function to handle the POST requests
export async function handlePOSTRequest(path, request, env) {
    // Try to get the public key cookie
    const cookies = request.headers.get('Cookie');
    const server_pub_key_cookie = cookies ? cookies.split('; ').find(row => row.startsWith('server_public_key=')) : null;
    const server_pub_key_cookie_value = server_pub_key_cookie ? server_pub_key_cookie.split('=')[1] : undefined;
    var base64PublicKey = server_pub_key_cookie_value;

    // Encryption setup request
    if(path == '/encryption') {
        // Check if the public key cookie doesn't already exist
        if(server_pub_key_cookie_value == undefined) {
            // Generate a Public-Private key pair
            const { publicKey, privateKey } = await generateKeyPair();

            // Get base64 string of the public key
            const exportedKeyPublic = await crypto.subtle.exportKey('spki', publicKey);
            base64PublicKey = btoa(String.fromCharCode(...new Uint8Array(exportedKeyPublic)));

            // Get base64 of the private key
            const exportedKeyPrivate = await crypto.subtle.exportKey('pkcs8', privateKey);
            var base64PrivateKey = btoa(String.fromCharCode(...new Uint8Array(exportedKeyPrivate)));

            // Store the Public-Private key pair in KV Store to be used later
            await env.YOURPOSTCARD_KVBIND.put(base64PublicKey, base64PrivateKey, { expirationTtl: 86400 });

            // Send the public key to the website
            return makeResponse(request, 200, { set: true, name: "server_public_key", value: base64PublicKey }, base64PublicKey)
        }

        // Nothing to be done; cookie already exists
        return makeResponse(request, 200, { set: false }, base64PublicKey)
    }
    // Encryption check request 
    else if(path == "/enccheck") {
        // Check if public key cookie is set
        if(server_pub_key_cookie_value == undefined) {
            return makeResponse(request, 400, { set: false }, `Public key cookie not found!`)
        }

        // Get the private key
        var base64PrivateKey = await env.YOURPOSTCARD_KVBIND.get(base64PublicKey);
        // Check if private key exists in the KV Store
        if(base64PrivateKey == undefined) {
            return makeResponse(request, 401, { set: true, name: server_public_key, value: '', age: 0 }, `Invalid public key!`)
        }

        // Import the private key
        const privateKey = await importPrivateKeyFromBase64(base64PrivateKey);

        // Get the content sent in the body
        const body_txt = await request.text();

        try {
            // Decrypt the body
            const message = arrayBufferToString(await decryptMessage(privateKey, base64ToArrayBuffer(body_txt)));
            // Check if the body matches the expected string
            if(message == "diditwork?") {
                return makeResponse(request, 200, { set: false }, message)
            }
            // Body doesn't match expected string
            return makeResponse(request, 401, { set: false }, `ERROR! Expecting "diditwork?" but got "${message}"!`)
        } catch(e) {
            // Decryption failed
            return makeResponse(request, 401, { set: false }, `ERROR! Decryption failed!\n"${e}"!`)
        }
    }
    // Actual data transfer request
    else if(path == "/senddata") {
        var base64PrivateKey = await env.YOURPOSTCARD_KVBIND.get(base64PublicKey);
        // Check to see if the public key has a private key pair
        if(base64PrivateKey == undefined) {
            return makeResponse(request, 401, { set: false }, `Invalid/non-existant public key!`)
        }
        // Get the private key
        const privateKey = await importPrivateKeyFromBase64(base64PrivateKey);
        // Decrypt the messages and glue them together
        const body_txt = (await request.text()).split("\n");
        var message = "";
        for(var i = 0; i < body_txt.length; i++) {
            const s = body_txt[i];
            if(s != '')
                message += arrayBufferToString(await decryptMessage(privateKey, base64ToArrayBuffer(s)));
        }

        // Check if JSON String is valid
        if(isValidJson(message)) {
            // Convert the received data into a JSON object
            const messageJSON = JSON.parse(message);

            // Check if all fields are present
            const topLevelFields = ['sender', 'receiver', 'content'];
            const senderFields = ['name', 'contact'];
            const receiverFields = ['name', 'building', 'flat_number', 'door_number', 'street_name', 'state', 'pincode'];
            var hasFields = topLevelFields.every(field => messageJSON.hasOwnProperty(field));
            if(hasFields) {
                hasFields = senderFields.every(field => messageJSON['sender'].hasOwnProperty(field));
                if(hasFields) 
                    hasFields = receiverFields.every(field => messageJSON['receiver'].hasOwnProperty(field));
                else hasFields = false;
            } else hasFields = false;

            // Valid JSON string sent
            if(hasFields) {
                // TODO Implement save feature

                const db = await Firestore.init({
                    uid: 'YourPostcard Cloudflare API',
                    project_id: env.project_id,
                    client_email: env.client_email,
                    private_key: env.private_key,
                    private_key_id: env.private_key_id,
                    claims: {
                        premium_account: true,
                    },
                });
                // console.log(await Firestore.set(db, 'postcards/', messageJSON));
                await Firestore.set(
                    db,
                    'postcards',
                    `${Date.now()}-${messageJSON['sender']['name']}`,
                    messageJSON
                  );
                return makeResponse(request, 200, { set: false }, `OK`)
            }

            // Some fields are absent
            return makeResponse(request, 400, { set: false }, `Missing fields in JSON!`)
        }
        
        // The JSON string is malformed
        return makeResponse(request, 400, { set: false }, `Invalid JSON string sent!`)
    }
    // Invalid path requested
    else {
        return makeResponse(request, 403, { set: false }, `Unknown path!!!`)
    }
}