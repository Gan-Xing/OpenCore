export function downloadBase64File(
  filename: string,
  contentBase64: string,
  contentType: string,
): void {
  const payload = contentBase64.includes(',')
    ? contentBase64.slice(contentBase64.indexOf(',') + 1)
    : contentBase64;
  const byteCharacters = atob(payload);
  const bytes = new Uint8Array(byteCharacters.length);

  for (let index = 0; index < byteCharacters.length; index += 1) {
    bytes[index] = byteCharacters.charCodeAt(index);
  }

  const objectUrl = URL.createObjectURL(
    new Blob([bytes], { type: contentType }),
  );
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
}
