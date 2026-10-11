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
  // .inetloc/.fileloc/.ftploc/.afploc open URLs, files or servers; disk images mount on open.
  "inetloc", "fileloc", "ftploc", "afploc", "wflow", "service", "plugin", "bundle", "kext", "xpc",
  "qlgenerator", "iso", "img", "sparseimage", "sparsebundle",
  // Windows
  "exe", "msi", "msp", "bat", "cmd", "com", "scr", "pif", "lnk", "url", "cpl", "msc", "reg",
  "inf", "dll", "ps1", "psm1", "vbs", "vbe", "js", "jse", "wsf", "wsh", "hta", "appx",
  "msix", "msixbundle", "appxbundle", "appinstaller", "application", "gadget", "chm", "scf", "sct",
  "wsc", "settingcontent-ms", "library-ms", "search-ms", "diagcab", "rdp", "ocx", "sys", "drv",
  "xll", "vb", "ws", "ade", "adp", "mde", "ps1xml", "psc1", "mst",
  // Unix and cross-platform
  "sh", "bash", "zsh", "fish", "ksh", "csh", "run", "bin", "so", "desktop", "appimage",
  "jar", "jnlp", "py", "pyw", "pyc", "rb", "pl", "php", "deb", "rpm", "apk", "ipa",
];

/// Web documents run script in the browser (even from a local file), so they are refused with their
/// own code and the user can still open them from Finder. SVG stays allowed.
const BLOCKED_WEB_EXTENSIONS: &[&str] = &["html", "htm", "xhtml"];

/// NTFS alternate data stream ("report.pdf:evil.exe"). Only meaningful on Windows: on macOS a colon
/// is a legal character that Finder shows as a slash.
fn has_stream_marker(name: &str) -> bool {
  name.contains(':')
}

fn is_blocked_extension(path: &std::path::Path) -> bool {
  let Some(name) = path.file_name().and_then(|n| n.to_str()) else { return true };
  if cfg!(windows) && has_stream_marker(name) {
    return true;
  }
  // Windows ignores trailing dots and spaces, so "run.exe " and "run.exe." are run.exe.
  let trimmed = name.trim_end_matches(|c| c == ' ' || c == '.');
  match std::path::Path::new(trimmed).extension().and_then(|e| e.to_str()) {
    Some(ext) if !ext.is_empty() => BLOCKED_EXTENSIONS.contains(&ext.to_ascii_lowercase().as_str()),
    _ => true,
  }
}

fn is_blocked_web(path: &std::path::Path) -> bool {
  let Some(name) = path.file_name().and_then(|n| n.to_str()) else { return false };
  // Same trailing dot/space rule as above: "page.html." opens as page.html on Windows.
  let trimmed = name.trim_end_matches(|c| c == ' ' || c == '.');
  match std::path::Path::new(trimmed).extension().and_then(|e| e.to_str()) {
    Some(ext) => BLOCKED_WEB_EXTENSIONS.contains(&ext.to_ascii_lowercase().as_str()),
    None => false,
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
  if is_blocked_web(&canonical) {
    return Err("blocked_web".into());
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
/// "inside a granted vault". The path goes to the opener as one argument, never through a shell, and
/// is always the absolute canonical path, so it can never start with `-` and be read as an option.
/// Known limit: the file could be swapped between this check and the opener starting (needs write
/// access to the vault, which already means the attacker can write any note).
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
  fn blocks_url_and_location_files_scripts_and_images_that_mount() {
    for name in [
      "a.inetloc", "a.fileloc", "a.ftploc", "a.jnlp", "a.workflow", "a.sparseimage", "a.iso",
      "a.msix", "a.chm", "a.scf", "a.rdp", "a.settingcontent-ms", "a.Inetloc",
    ] {
      assert!(is_blocked_extension(Path::new(name)), "{name} should be blocked");
    }
  }

  #[test]
  fn refuses_web_documents_case_insensitively_but_keeps_svg() {
    for name in ["a.html", "a.HTM", "a.xhtml", "a.Html", "page.html.", "page.htm ", "page.xhtml. ."] {
      assert!(is_blocked_web(Path::new(name)), "{name:?} should be blocked_web");
    }
    for name in ["a.svg", "a.pdf", "a.md", "html", "a.html.txt"] {
      assert!(!is_blocked_web(Path::new(name)), "{name:?} should not be blocked_web");
    }
  }

  #[test]
  fn checked_file_reports_blocked_web_with_its_own_code() {
    let dir = std::env::temp_dir().join(format!("maia-web-{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    let html = dir.join("Page.HTML");
    let svg = dir.join("pic.svg");
    std::fs::write(&html, "<script>1</script>").unwrap();
    std::fs::write(&svg, "<svg/>").unwrap();
    assert_eq!(checked_file(html.to_str().unwrap()).unwrap_err(), "blocked_web");
    assert!(checked_file(svg.to_str().unwrap()).is_ok());
    std::fs::remove_dir_all(&dir).ok();
  }

  #[test]
  fn ignores_trailing_dots_and_spaces_like_windows_does() {
    for name in ["run.exe ", "run.exe.", "run.exe. .", "run.EXE  "] {
      assert!(is_blocked_extension(Path::new(name)), "{name:?} should be blocked");
    }
    assert!(!is_blocked_extension(Path::new("notes.pdf ")));
  }

  #[test]
  fn detects_alternate_data_streams() {
    assert!(has_stream_marker("report.pdf:evil.exe"));
    assert!(has_stream_marker("a.txt:hidden:$DATA"));
    assert!(!has_stream_marker("report.pdf"));
    // a stream suffix hides the real type from an extension check, so Windows builds refuse it
    #[cfg(windows)]
    assert!(is_blocked_extension(Path::new("report.pdf:evil")));
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

  #[test]
  fn refuses_app_bundles_and_other_directories() {
    let dir = scratch("bundles");
    let bundle = dir.join("Evil.app");
    std::fs::create_dir_all(bundle.join("Contents/MacOS")).unwrap();
    std::fs::write(bundle.join("Contents/MacOS/Evil"), b"x").unwrap();
    assert_eq!(checked_file(bundle.to_str().unwrap()), Err("not_a_file".into()));
    // the executable inside has no extension
    assert_eq!(checked_file(bundle.join("Contents/MacOS/Evil").to_str().unwrap()), Err("blocked_type".into()));
    let _ = std::fs::remove_dir_all(&dir);
  }

  #[test]
  fn treats_urls_and_odd_strings_as_missing_paths() {
    for input in ["file:///etc/hosts", "https://example.com/a.pdf", "", "a\0b.pdf", "--help", "-n"] {
      assert_eq!(checked_file(input), Err("missing".into()), "{input:?}");
    }
  }

  #[test]
  fn hands_the_opener_an_absolute_path_even_when_the_name_starts_with_a_dash() {
    let dir = scratch("dash");
    let file = dir.join("-rf.pdf");
    std::fs::write(&file, b"x").unwrap();
    let canonical = checked_file(file.to_str().unwrap()).unwrap();
    assert!(canonical.is_absolute());
    assert!(!canonical.to_string_lossy().starts_with('-'));
    let _ = std::fs::remove_dir_all(&dir);
  }

  #[cfg(unix)]
  #[test]
  fn refuses_a_symlink_to_a_directory_and_a_dangling_link() {
    let dir = scratch("links");
    let sub = dir.join("sub");
    std::fs::create_dir_all(&sub).unwrap();
    let to_dir = dir.join("dirlink.pdf");
    std::os::unix::fs::symlink(&sub, &to_dir).unwrap();
    let dangling = dir.join("gone.pdf");
    std::os::unix::fs::symlink(dir.join("nowhere"), &dangling).unwrap();
    assert_eq!(checked_file(to_dir.to_str().unwrap()), Err("not_a_file".into()));
    assert_eq!(checked_file(dangling.to_str().unwrap()), Err("missing".into()));
    let _ = std::fs::remove_dir_all(&dir);
  }
}
