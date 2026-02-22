import { getFileNameFromPath } from '../utils/thesisUtils';

export default function useThesisDownloader({ API, showToast, t }) {
  return async function downloadThesisFile({ thesisId, fileType, filePath, topic }) {
    try {
      const response = await API.getThesisFile(thesisId, fileType);
      const blob = response.data;

      const url = globalThis.URL.createObjectURL(blob);
      const link = document.createElement('a');

      const contentDisposition = response.headers?.['content-disposition'] || '';
      const serverFileNameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);

      const fileName =
        serverFileNameMatch?.[1] || getFileNameFromPath(filePath) || `${String(topic || 'thesis')}_${fileType}`;

      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      globalThis.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Error downloading ${fileType}:`, error);
      showToast({
        success: false,
        title: t('carriera.conclusione_tesi.download_error'),
        message: t('carriera.conclusione_tesi.download_error_content'),
      });
    }
  };
}
