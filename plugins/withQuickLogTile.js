// Android quick settings tile "Quick log" (Stage 2 Phase 6). A tap opens spendly://add?quick=1, which saves the Quick
// log set up in Settings → Shortcuts, with Undo in the app. Generated at prebuild: never edit android/ by hand.
const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SERVICE = '.QuickLogTileService';

const kotlin = (pkg) => `package ${pkg}

import android.app.PendingIntent
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.service.quicksettings.TileService

/** Quick settings tile: opens spendly://add?quick=1, which saves the Quick log (Settings → Shortcuts). */
class QuickLogTileService : TileService() {
  override fun onClick() {
    super.onClick()
    // On a locked phone, ask to unlock first: the app is about to save an expense
    if (isLocked) unlockAndRun { openQuickLog() } else openQuickLog()
  }

  private fun openQuickLog() {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("spendly://add?quick=1")).apply {
      setPackage(packageName)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      val pending = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
      startActivityAndCollapse(pending)
    } else {
      @Suppress("DEPRECATION")
      startActivityAndCollapse(intent)
    }
  }
}
`;

// A plain "plus in a circle" outline; the system tints tile icons, so the color here doesn't matter
const icon = `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">
  <path android:fillColor="#FFFFFFFF"
      android:pathData="M11,7h2v4h4v2h-4v4h-2v-4H7v-2h4V7zM12,2C6.48,2 2,6.48 2,12s4.48,10 10,10 10,-4.48 10,-10S17.52,2 12,2zM12,20c-4.41,0 -8,-3.59 -8,-8s3.59,-8 8,-8 8,3.59 8,8 -3.59,8 -8,8z"/>
</vector>
`;

const strings = (label) => `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <string name="quick_log_tile_label">${label}</string>
</resources>
`;

const withTileFiles = (config) =>
  withDangerousMod(config, [
    'android',
    (config) => {
      const pkg = config.android?.package;
      if (!pkg) throw new Error('withQuickLogTile: expo.android.package is required');
      const main = path.join(config.modRequest.platformProjectRoot, 'app', 'src', 'main');
      const write = (file, content) => {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, content);
      };
      write(path.join(main, 'java', ...pkg.split('.'), 'QuickLogTileService.kt'), kotlin(pkg));
      write(path.join(main, 'res', 'drawable', 'ic_quick_log_tile.xml'), icon);
      // Own resource files, so nothing else's strings.xml is touched
      write(path.join(main, 'res', 'values', 'quick_log_tile.xml'), strings('Quick log'));
      write(path.join(main, 'res', 'values-ar', 'quick_log_tile.xml'), strings('تسجيل سريع'));
      return config;
    },
  ]);

const withTileService = (config) =>
  withAndroidManifest(config, (config) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    application.service = (application.service ?? []).filter((service) => service.$['android:name'] !== SERVICE);
    application.service.push({
      $: {
        'android:name': SERVICE,
        'android:exported': 'true',
        'android:label': '@string/quick_log_tile_label',
        'android:icon': '@drawable/ic_quick_log_tile',
        'android:permission': 'android.permission.BIND_QUICK_SETTINGS_TILE',
      },
      'intent-filter': [{ action: [{ $: { 'android:name': 'android.service.quicksettings.action.QS_TILE' } }] }],
    });
    return config;
  });

module.exports = (config) => withTileService(withTileFiles(config));
