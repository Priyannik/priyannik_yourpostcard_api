// Helper to check if the JSON string is valid
export function isValidJson(jsonString) {
    try {
        JSON.parse(jsonString);
        return true;  // If parsing is successful, it's valid JSON
    } catch (e) {
        return false; // If an error is thrown, it's not valid JSON
    }
}

// Helper to convert base64 encoded data into a ArrayBuffer
export function base64ToArrayBuffer(base64) {
	const binaryString = atob(base64);
	const len = binaryString.length;
	const bytes = new Uint8Array(len);
	for (let i = 0; i < len; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	return bytes.buffer;
}  

// Helper to convert an ArrayBuffer to a String
export function arrayBufferToString(buffer) {
    const decoder = new TextDecoder("utf-8");
    return decoder.decode(buffer);
}