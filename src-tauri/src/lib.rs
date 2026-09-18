use tauri::Manager;
use tauri_plugin_fs::FsExt;

/// Grants both the fs plugin's scope and the asset-protocol's scope access
/// to a user-picked vault folder at runtime, so the static `fs:scope` in
/// capabilities/default.json (and `security.assetProtocol.scope` in
/// tauri.conf.json) can stay empty instead of covering all of `$HOME`.
///
/// The vault's asset store (`<vault>/.maia-assets/...`, see
/// src/lib/assetStore.js) lives under the same picked folder, so one grant
/// covers both the markdown files and the project assets — no separate,
/// location-anchored static scope entry needed for either.
///
/// `tauri-plugin-persisted-scope` listens for both of these grants and
/// restores them automatically on the next launch, so the user only has to
/// re-pick if they explicitly change vaults.
#[tauri::command]
fn allow_vault_scope(app: tauri::AppHandle, path: String) -> Result<(), String> {
  app
    .fs_scope()
    .allow_directory(&path, true)
    .map_err(|e| e.to_string())?;
  app
    .asset_protocol_scope()
    .allow_directory(&path, true)
    .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_persisted_scope::init())
    .invoke_handler(tauri::generate_handler![allow_vault_scope])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
