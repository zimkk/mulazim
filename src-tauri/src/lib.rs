use tauri::{
    menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder},
    Emitter, Manager,
};
#[cfg(target_os = "macos")]
use tauri::menu::AboutMetadata;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        // single-instance MUST be the first plugin registered.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            build_menu(app)?;
            Ok(())
        })
        .on_menu_event(|app, event| {
            // Custom items route to the frontend; predefined items are handled by the OS.
            match event.id().0.as_str() {
                "settings" => {
                    let _ = app.emit("menu:navigate", "/settings");
                }
                "about" => {
                    let _ = app.emit("menu:navigate", "/settings/about");
                }
                "shortcuts" => {
                    let _ = app.emit("menu:action", "shortcuts");
                }
                "new-task" => {
                    let _ = app.emit("menu:action", "new-task");
                }
                "new-project" => {
                    let _ = app.emit("menu:action", "new-project");
                }
                "command-palette" => {
                    let _ = app.emit("menu:action", "command-palette");
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn build_menu<R: tauri::Runtime>(app: &tauri::App<R>) -> tauri::Result<()> {
    let handle = app.handle();

    let settings = MenuItemBuilder::with_id("settings", "Settings…")
        .accelerator("CmdOrCtrl+,")
        .build(app)?;
    let new_task = MenuItemBuilder::with_id("new-task", "New Task")
        .accelerator("CmdOrCtrl+N")
        .build(app)?;
    let new_project = MenuItemBuilder::with_id("new-project", "New Project")
        .accelerator("CmdOrCtrl+Shift+P")
        .build(app)?;
    let palette = MenuItemBuilder::with_id("command-palette", "Go to…")
        .accelerator("CmdOrCtrl+K")
        .build(app)?;
    let shortcuts = MenuItemBuilder::with_id("shortcuts", "Keyboard Shortcuts")
        .accelerator("CmdOrCtrl+/")
        .build(app)?;
    #[cfg(not(target_os = "macos"))]
    let about = MenuItemBuilder::with_id("about", "About Grid Manager").build(app)?;

    #[allow(unused_mut)]
    let mut builder = MenuBuilder::new(app);

    // macOS gets a proper application menu.
    #[cfg(target_os = "macos")]
    {
        let meta = AboutMetadata {
            name: Some("Grid Manager".into()),
            version: Some(app.package_info().version.to_string()),
            ..Default::default()
        };
        let app_menu = SubmenuBuilder::new(app, "Grid Manager")
            .about(Some(meta))
            .separator()
            .item(&settings)
            .separator()
            .services()
            .separator()
            .hide()
            .hide_others()
            .show_all()
            .separator()
            .quit()
            .build()?;
        builder = builder.item(&app_menu);
    }

    let file_menu = {
        let mut b = SubmenuBuilder::new(app, "File")
            .item(&new_task)
            .item(&new_project)
            .separator();
        #[cfg(not(target_os = "macos"))]
        {
            b = b.item(&settings).separator().item(&about).separator().quit();
        }
        #[cfg(target_os = "macos")]
        {
            b = b.close_window();
        }
        b.build()?
    };

    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;

    let view_menu = SubmenuBuilder::new(app, "View")
        .item(&palette)
        .separator()
        .fullscreen()
        .build()?;

    let window_menu = SubmenuBuilder::new(app, "Window")
        .minimize()
        .maximize()
        .separator()
        .build()?;

    let help_menu = {
        #[allow(unused_mut)]
        let mut b = SubmenuBuilder::new(app, "Help").item(&shortcuts);
        #[cfg(not(target_os = "macos"))]
        {
            b = b.separator().item(&about);
        }
        b.build()?
    };

    let menu = builder
        .item(&file_menu)
        .item(&edit_menu)
        .item(&view_menu)
        .item(&window_menu)
        .item(&help_menu)
        .build()?;

    handle.set_menu(menu)?;
    Ok(())
}
