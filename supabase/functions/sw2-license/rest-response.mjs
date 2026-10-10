export async function readDatabaseResponse(response) {
 if (!response.ok) throw new Error('Database operation failed');
 const body = await response.text();
 return body.trim() === '' ? null : JSON.parse(body);
}
