export async function parallelMap(input, workerFn, concurrency = 5){
    const results = [];
    const queue = [...input];
    const workers = Array.from({length: concurrency}, async () => {
        while(queue.length > 0){
            const item = queue.shift();
            try {
                const result = await workerFn(item);
                results.push(result);
            } catch (error) {
                results.push({ error: error.message, item });
            }
        }
    });
    await Promise.all(workers);
    return results;
}