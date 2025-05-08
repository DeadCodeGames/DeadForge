import { finished } from 'stream/promises';
import { StringDecoder } from 'string_decoder';
import { JsonStreamStringify } from 'json-stream-stringify';

export async function safeStringify(input: unknown): Promise<string> {
    const stringifyStream = new JsonStreamStringify(input);
    const decoder = new StringDecoder('utf8');
    let result = '';

    stringifyStream.on('data', (chunk) => {

        const chunkStr = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk;

        if (chunkStr.includes("null")) stringifyStream.destroy();
        result += decoder.write(chunk);
    });

    stringifyStream.on('error', (err) => {
        console.error('Stream error:', err);
    });

    stringifyStream.on('end', () => {
        console.log('Stream ended');
    });
    
    stringifyStream.resume();
    
    await finished(stringifyStream);
    
    result += decoder.end();
    console.log("Final result:", result);
    return result;
}
