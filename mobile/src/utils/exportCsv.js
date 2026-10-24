import { Platform, Share, Alert, Linking } from 'react-native';
import { getServerUrl } from '../api/client';

/**
 * Universally export and download CSV files across Web, Chrome, Android, and iOS.
 * - In Chrome / Web / PWA: Directly triggers browser file download saving to Downloads.
 * - On Native Android / iOS: Opens native Save to Files / Share dialog.
 */
export async function exportCsvFile(filename, rows) {
  try {
    if (!rows || rows.length === 0) {
      Alert.alert('No Records', 'No data available to download.');
      return false;
    }

    const escapeCell = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvContent = '\uFEFF' + rows.map((r) => r.map(escapeCell).join(',')).join('\r\n');

    // ── 1. WEB / CHROME BROWSER / PWA: Direct DOM File Download ──
    if (Platform.OS === 'web' || typeof document !== 'undefined') {
      try {
        let blobUrl = '';
        try {
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          blobUrl = URL.createObjectURL(blob);
        } catch (_) {
          // Data URI fallback if Blob is restricted
          blobUrl = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
        }

        const link = document.createElement('a');
        link.style.display = 'none';
        link.setAttribute('href', blobUrl);
        link.setAttribute('download', filename);
        link.target = '_blank';

        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
          try {
            if (link.parentNode) {
              document.body.removeChild(link);
            }
            if (blobUrl.startsWith('blob:')) {
              URL.revokeObjectURL(blobUrl);
            }
          } catch (_) {}
        }, 60000);

        return true;
      } catch (webErr) {
        console.warn('[exportCsvFile] Web DOM download error:', webErr);
      }
    }

    // ── 2. NATIVE ANDROID & iOS MOBILE: Native Share / Save to Files / Downloads ──
    const shareOptions = {
      title: filename,
      message: csvContent,
      subject: filename,
    };

    // On iOS, provide data URL for Save to Files action
    if (Platform.OS === 'ios') {
      shareOptions.url = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    }

    await Share.share(shareOptions, {
      dialogTitle: `Download / Save ${filename}`,
      subject: filename,
    });

    return true;
  } catch (error) {
    console.warn('[exportCsvFile] Export error:', error);
    Alert.alert('Download Error', error.message || 'Could not download CSV file.');
    return false;
  }
}

/**
 * Universal one-click download for 11-Sheet Excel Allocation Workbook (.xlsx)
 */
export async function downloadExcelReport() {
  try {
    const url = `${getServerUrl()}/api/export-excel`;
    if (Platform.OS === 'web' || typeof document !== 'undefined') {
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Chandapura_Depot_Battery_Allocation.xlsx');
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        try {
          if (link.parentNode) document.body.removeChild(link);
        } catch (_) {}
      }, 3000);
      return true;
    } else {
      const supported = await Linking.canOpenURL(url).catch(() => true);
      if (supported) {
        await Linking.openURL(url);
        return true;
      }
    }
  } catch (err) {
    Alert.alert('Download Error', err.message || 'Could not download Excel workbook.');
    return false;
  }
}

/**
 * Universal one-click download for Operational PDF Report (.pdf)
 */
export async function downloadPdfReport() {
  try {
    const url = `${getServerUrl()}/api/download-pdf`;
    if (Platform.OS === 'web' || typeof document !== 'undefined') {
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Ashok_Leyland_Operational_Report.pdf');
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        try {
          if (link.parentNode) document.body.removeChild(link);
        } catch (_) {}
      }, 3000);
      return true;
    } else {
      const supported = await Linking.canOpenURL(url).catch(() => true);
      if (supported) {
        await Linking.openURL(url);
        return true;
      }
    }
  } catch (err) {
    Alert.alert('Download Error', err.message || 'Could not download PDF report.');
    return false;
  }
}
