import { Platform, Alert, Linking } from 'react-native';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as FileSystemRoot from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getServerUrl } from '../api/client';

/**
 * Resolves the available FileSystem module and destination directory.
 * Supports Expo SDK legacy and modern exports across Android, iOS, and Expo Go.
 */
function resolveFileSystem() {
  // 1. Prefer legacy module (standard across Expo FileSystem for writeAsStringAsync)
  const legacyDir = FileSystemLegacy?.cacheDirectory || FileSystemLegacy?.documentDirectory;
  if (legacyDir && typeof FileSystemLegacy?.writeAsStringAsync === 'function') {
    return {
      fs: FileSystemLegacy,
      dir: legacyDir,
      mode: 'legacy',
    };
  }

  // 2. Fall back to root module if it provides legacy-style methods
  const rootDir = FileSystemRoot?.cacheDirectory || FileSystemRoot?.documentDirectory;
  if (rootDir && typeof FileSystemRoot?.writeAsStringAsync === 'function') {
    return {
      fs: FileSystemRoot,
      dir: rootDir,
      mode: 'legacy',
    };
  }

  // 3. Fall back to modern FileSystem API (Paths & File)
  if (FileSystemRoot?.Paths?.cache || FileSystemRoot?.Paths?.document) {
    const modernDir = FileSystemRoot.Paths.cache || FileSystemRoot.Paths.document;
    return {
      fs: FileSystemRoot,
      dir: modernDir,
      mode: 'modern',
    };
  }

  return null;
}

/**
 * Writes the CSV text to a physical file on the device filesystem.
 */
async function writeCsvFileToDevice(safeFilename, csvContent) {
  const target = resolveFileSystem();
  if (!target) {
    throw new Error('FileSystem storage is not available on this device.');
  }

  if (target.mode === 'modern' && typeof target.fs.File === 'function') {
    const file = new target.fs.File(target.dir, safeFilename);
    if (typeof file.write === 'function') {
      await file.write(csvContent);
      return file.uri;
    }
  }

  const dirUri = typeof target.dir === 'string' ? target.dir : target.dir.uri;
  const normalizedDir = dirUri.endsWith('/') ? dirUri : `${dirUri}/`;
  const fileUri = `${normalizedDir}${safeFilename}`;
  const encoding = target.fs?.EncodingType?.UTF8 || 'utf8';

  await target.fs.writeAsStringAsync(fileUri, csvContent, { encoding });
  return fileUri;
}

/**
 * Universally export and download CSV files across Web, Chrome, Android, and iOS.
 * - In Chrome / Web / PWA: Directly triggers browser file download saving to Downloads.
 * - On Native Android / iOS: Creates an actual .csv file with UTF-8 BOM in cache/documents,
 *   and opens the native sharing sheet with mimeType "text/csv" via Expo Sharing.
 */
export async function exportCsvFile(filename, rows) {
  try {
    if (!rows || rows.length === 0) {
      Alert.alert('No Records', 'No data available to download.');
      return false;
    }

    let safeFilename = (filename || 'export.csv').trim();
    safeFilename = safeFilename.replace(/[/\\?%*:|"<>]/g, '_');
    if (!safeFilename.toLowerCase().endsWith('.csv')) {
      safeFilename += '.csv';
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
        link.setAttribute('download', safeFilename);
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

    // ── 2. NATIVE ANDROID & iOS MOBILE: FileSystem & Expo Sharing ──
    let fileUri = '';
    try {
      fileUri = await writeCsvFileToDevice(safeFilename, csvContent);
    } catch (fsErr) {
      console.warn('[exportCsvFile] FileSystem write error:', fsErr);
      Alert.alert(
        'Export Unavailable',
        'Device storage is unavailable or cannot save temporary export files.'
      );
      return false;
    }

    if (!Sharing || typeof Sharing.shareAsync !== 'function') {
      Alert.alert(
        'Sharing Unavailable',
        'Native file sharing is not supported on this device.'
      );
      return false;
    }

    const isAvailable = await Sharing.isAvailableAsync().catch(() => false);
    if (!isAvailable) {
      Alert.alert(
        'Sharing Unavailable',
        'Native file sharing is not available or enabled on this device.'
      );
      return false;
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: 'Save or share CSV',
      UTI: 'public.comma-separated-values-text',
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
