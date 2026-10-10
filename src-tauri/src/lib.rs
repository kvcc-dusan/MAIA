use tauri::Manager;
use tauri_plugin_fs::FsExt;

/// Grants both the fs plugin's scope and the asset-protocol's scope access
/// to a user-picked vault folder at runtime, so the static `fs:scope` in
/// capabilities/default.json (and `security.assetProtocol.scope` in
/// tauri.conf.json) can stay empty instead of covering all of `$HOME`.
///
/// Opus projects and their assets (`<vault>/Opus/<Project>/assets/...`, see
/// src/lib/opusFiles/assetFiles.js) live under the same picked folder, so one
/// grant covers the markdown files and the project assets. The grant is
/// recursive but does not match dot-prefixed paths, so the vault must never
/// use them.
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

/// File types that run code or install software when the OS "opens" them. Opening is refused
/// for these, and for files with no extension at all (can't tell a note from a script).
/// Lowercase, without the dot.
const BLOCKED_EXTENSIONS: &[&str] = &[
  // macOS
  "app", "appex", "command", "tool", "scpt", "scptd", "applescript", "workflow", "action",
  "dmg", "pkg", "mpkg", "prefpane", "saver", "terminal", "webloc", "mobileconfig", "dylib",
  // Windows
  "exe", "msi", "msp", "bat", "cmd", "com", "scr", "pif", "lnk", "url", "cpl", "msc", "reg",
  "inf", "dll", "ps1", "psm1", "vbs", "vbe", "js", "jse", "wsf", "wsh", "hta", "appx",
  // Unix and cross-platform
  "sh", "bash", "zsh", "fish", "ksh", "csh", "run", "bin", "so", "desktop", "appimage",
  "jar", "jnlp", "py", "pyc", "rb", "pl", "php",
];

fn is_blocked_extension(path: &std::path::Path) -> bool {
  match path.extension().and_then(|e| e.to_str()) {
    Some(ext) if !ext.is_empty() => BLOCKED_EXTENSIONS.contains(&ext.to_ascii_lowercase().as_str()),
    _ => true,
  }
}

/// Resolves symlinks and `..`, then refuses anything that is not an existing regular file with
/// an openable type. Error strings are stable codes the frontend maps to user-facing copy.
fn checked_file(path: &str) -> Result<std::path::PathBuf, String> {
  let canonical = std::fs::canonicalize(path).map_err(|_| "missing".to_string())?;
  if !canonical.is_file() {
    return Err("not_a_file".into());
  }
  if is_blocked_extension(&canonical) {
    return Err("blocked_type".into());
  }
  Ok(canonical)
}

#[cfg(target_os = "macos")]
fn opener() -> std::process::Command { std::process::Command::new("open") }
#[cfg(target_os = "windows")]
fn opener() -> std::process::Command { std::process::Command::new("explorer.exe") }
#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn opener() -> std::process::Command { std::process::Command::new("xdg-open") }

/// Opens a vault file in the OS default app. The path is canonicalized first, so the scope check
/// sees the real location: a symlink pointing out of the vault is refused. The fs scope holds
/// only the folders the user picked (see `allow_vault_scope`), so "allowed by scope" means
/// "inside a granted vault". The path goes to the opener as one argument, never through a shell.
#[tauri::command]
async fn open_in_default_app(app: tauri::AppHandle, path: String) -> Result<(), String> {
  let canonical = checked_file(&path)?;
  if !app.fs_scope().is_allowed(&canonical) {
    return Err("outside_vault".into());
  }
  let status = opener()
    .arg(&canonical)
    .status()
    .map_err(|_| "open_failed".to_string())?;
  if status.success() { Ok(()) } else { Err("open_failed".into()) }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_persisted_scope::init())
    .invoke_handler(tauri::generate_handler![allow_vault_scope, open_in_default_app])
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

#[cfg(test)]
mod tests {
  use super::*;
  use std::path::Path;

  #[test]
  fn blocks_executable_and_script_types_case_insensitively() {
    for name in [
      "a.app", "a.command", "a.sh", "a.EXE", "a.bat", "a.scpt", "a.dmg", "a.pkg", "a.jar",
      "a.Ps1", "a.js", "a.lnk", "a.webloc", "a.py", "a.desktop", "a.msi", "a.terminal",
    ] {
      assert!(is_blocked_extension(Path::new(name)), "{name} should be blocked");
    }
  }

  #[test]
  fn blocks_files_without_an_extension() {
    assert!(is_blocked_extension(Path::new("Makefile")));
    assert!(is_blocked_extension(Path::new("script.")));
  }

  #[test]
  fn allows_documents_media_images_and_archives() {
    for name in ["a.pdf", "a.MP3", "a.mp4", "a.png", "a.docx", "a.zip", "a.txt", "a.csv"] {
      assert!(!is_blocked_extension(Path::new(name)), "{name} should be allowed");
    }
  }

  fn scratch(name: &str) -> std::path::PathBuf {
    let dir = std::env::temp_dir().join(format!("maia-open-test-{}-{name}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    dir
  }

  #[test]
  fn refuses_missing_directories_and_blocked_files() {
    let dir = scratch("checks");
    let pdf = dir.join("a.pdf");
    let script = dir.join("run.sh");
    std::fs::write(&pdf, b"x").unwrap();
    std::fs::write(&script, b"x").unwrap();

    assert_eq!(checked_file(dir.join("nope.pdf").to_str().unwrap()), Err("missing".into()));
    assert_eq!(checked_file(dir.to_str().unwrap()), Err("not_a_file".into()));
    assert_eq!(checked_file(script.to_str().unwrap()), Err("blocked_type".into()));
    assert!(checked_file(pdf.to_str().unwrap()).is_ok());
    let _ = std::fs::remove_dir_all(&dir);
  }

  #[cfg(unix)]
  #[test]
  fn judges_a_symlink_by_its_target() {
    let dir = scratch("symlink");
    let target = dir.join("evil.sh");
    std::fs::write(&target, b"x").unwrap();
    let link = dir.join("looks-fine.pdf");
    std::os::unix::fs::symlink(&target, &link).unwrap();

    // the returned path is the resolved target, which is what the scope check then sees
    assert_eq!(checked_file(link.to_str().unwrap()), Err("blocked_type".into()));
    let _ = std::fs::remove_dir_all(&dir);
  }
}
