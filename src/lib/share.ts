/**
 * Entrega um arquivo para o Arão guardar: no iPhone abre a folha de compartilhar
 * (Arquivos, iCloud Drive, WhatsApp); sem ela, baixa o arquivo.
 * 'cancelled' quando ele fecha a folha sem escolher nada.
 */
export async function shareFile(content: string, fileName: string, type: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([content], fileName, { type });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      // Outro erro (ex.: compartilhar bloqueado): cai no download.
    }
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
