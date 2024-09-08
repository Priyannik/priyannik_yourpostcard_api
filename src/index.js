// Import required functions
import { handlePOSTRequest } from "./web_handler";

// Cloudflare entry point
export default {
	async fetch(request, env, ctx) {
		// Extract request apth
		const url = new URL(request.url);
		const path = url.pathname;

		// Got GET request
		if (request.method === 'GET') {
			if(path == "/" || path == "/index.html" || path == "/index") {
				return new Response(`Hello, World! This is the YourPostcard API used by Priyannik's YourPostcard Service.\nLink to YourPostcard --> https://your-postcard.pages.dev/`, {
					headers: { 
						'content-type': 'text/plain' ,
						"Access-Control-Allow-Origin" : request.headers.get('Origin'),
						"Access-Control-Allow-Headers": "Content-Type, Set-Cookie",
						"Access-Control-Allow-Credentials": "true"
					},
				})
			} else {
				return new Response('Unknown path!!!', {
					status: 403,
					headers: { 
						'content-type': 'text/plain' ,
						"Access-Control-Allow-Origin" : request.headers.get('Origin'),
						"Access-Control-Allow-Headers": "Content-Type, Set-Cookie",
						"Access-Control-Allow-Credentials": "true"
					},
				})
			}
		}
		// Got POST request
		else if(request.method === 'POST') {
			return handlePOSTRequest(path, request, env);
		}
		// Unknown request method
		else {
			return new Response('Method Not Allowed', {
				status: 405,
				headers: { 
					'content-type': 'text/plain' ,
					"Access-Control-Allow-Origin" : request.headers.get('Origin'),
					"Access-Control-Allow-Headers": "Content-Type, Set-Cookie",
					"Access-Control-Allow-Credentials": "true"
				},
			})
		}		
	},
};

