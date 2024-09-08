export async function importPrivateKeyFromBase64(base64Key) {
	const binaryString = atob(base64Key);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	const arrayBuffer = bytes.buffer;

	const privateKey = await crypto.subtle.importKey(
		'pkcs8',
		arrayBuffer,
		{
			name: 'RSA-OAEP',
			hash: 'SHA-256'
		},
		true,
		['decrypt']
	);

	return privateKey;
}

export async function generateKeyPair() {
	return await crypto.subtle.generateKey(
		{
			name: "RSA-OAEP",
			modulusLength: 2048,
			publicExponent: new Uint8Array([1, 0, 1]),
			hash: "SHA-256"
		},
		true, 
		["encrypt", "decrypt"]
	);
}

export async function encryptMessage(publicKey, message) {
	const encodedMessage = new TextEncoder().encode(message);
	return await crypto.subtle.encrypt(
		{ name: "RSA-OAEP" },
		publicKey,
		encodedMessage
	);
}

export async function decryptMessage(privateKey, ciphertext) {
	return await crypto.subtle.decrypt(
		{ name: "RSA-OAEP" },
		privateKey,
		ciphertext
	);
}