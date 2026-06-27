import { ObscuraFetch } from "./utils/start.js"; // adjust import path
(async () => {
    try {
        const result = await ObscuraFetch('https://example.com', {
            dump: 'text',
            timeout: 10,
            quiet: true, // suppress info logs
            // verbose: true,   // uncomment to see debug output
        });
        console.log('Result:', result);
    }
    catch (err) {
        console.error('Error:', err);
    }
})();
//# sourceMappingURL=test.js.map