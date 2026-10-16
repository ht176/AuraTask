#[cfg(desktop)]
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};
#[cfg(desktop)]
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, ShortcutState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder
            .setup(|app| {
                app.handle().plugin(tauri_plugin_process::init())?;
                app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
                app.handle().plugin(
                    tauri_plugin_global_shortcut::Builder::new()
                        .with_handler(|app, shortcut, event| {
                            if event.state == ShortcutState::Pressed {
                                use tauri::Emitter;

                                // 快捷录入: Ctrl+Alt+K (Win/Linux) 或 Cmd+Alt+K (Mac) 或兼容旧键位
                                if shortcut.matches(Modifiers::CONTROL | Modifiers::ALT, Code::KeyK)
                                    || shortcut.matches(Modifiers::SUPER | Modifiers::ALT, Code::KeyK)
                                    || shortcut.matches(Modifiers::CONTROL | Modifiers::SHIFT, Code::KeyK)
                                    || shortcut.matches(Modifiers::SUPER | Modifiers::SHIFT, Code::KeyK)
                                    || shortcut.matches(Modifiers::ALT | Modifiers::SHIFT, Code::KeyK)
                                {
                                    if let Some(window) = app.get_webview_window("main") {
                                        let _ = window.unminimize();
                                        let _ = window.show();
                                        let _ = window.set_focus();
                                    }
                                    let _ = app.emit("shortcut-action", "quick_add");
                                }
                                // 唤起/隐藏主窗口: Ctrl+Alt+T / Cmd+Alt+T
                                else if shortcut.matches(Modifiers::CONTROL | Modifiers::ALT, Code::KeyT)
                                    || shortcut.matches(Modifiers::SUPER | Modifiers::ALT, Code::KeyT)
                                    || shortcut.matches(Modifiers::CONTROL | Modifiers::SHIFT, Code::KeyT)
                                    || shortcut.matches(Modifiers::SUPER | Modifiers::SHIFT, Code::KeyT)
                                {
                                    if let Some(window) = app.get_webview_window("main") {
                                        if window.is_visible().unwrap_or(false) {
                                            let _ = window.hide();
                                        } else {
                                            let _ = window.unminimize();
                                            let _ = window.show();
                                            let _ = window.set_focus();
                                        }
                                    }
                                }
                                // 切换迷你便签: Ctrl+Alt+M / Cmd+Alt+M
                                else if shortcut.matches(Modifiers::CONTROL | Modifiers::ALT, Code::KeyM)
                                    || shortcut.matches(Modifiers::SUPER | Modifiers::ALT, Code::KeyM)
                                    || shortcut.matches(Modifiers::CONTROL | Modifiers::SHIFT, Code::KeyM)
                                    || shortcut.matches(Modifiers::SUPER | Modifiers::SHIFT, Code::KeyM)
                                {
                                    if let Some(window) = app.get_webview_window("main") {
                                        let _ = window.unminimize();
                                        let _ = window.show();
                                        let _ = window.set_focus();
                                    }
                                    let _ = app.emit("shortcut-action", "toggle_mini");
                                }
                                // 番茄钟: Ctrl+Alt+P / Cmd+Alt+P
                                else if shortcut.matches(Modifiers::CONTROL | Modifiers::ALT, Code::KeyP)
                                    || shortcut.matches(Modifiers::SUPER | Modifiers::ALT, Code::KeyP)
                                    || shortcut.matches(Modifiers::CONTROL | Modifiers::SHIFT, Code::KeyP)
                                    || shortcut.matches(Modifiers::SUPER | Modifiers::SHIFT, Code::KeyP)
                                {
                                    if let Some(window) = app.get_webview_window("main") {
                                        let _ = window.unminimize();
                                        let _ = window.show();
                                        let _ = window.set_focus();
                                    }
                                    let _ = app.emit("shortcut-action", "toggle_pomodoro");
                                }
                            }
                        })
                        .build(),
                )?;

                // 注册系统级默认全局快捷键 (Ctrl+Alt+对应键位)
                let global_shortcuts = [
                    "Control+Alt+K",
                    "CommandOrControl+Alt+K",
                    "Control+Alt+T",
                    "CommandOrControl+Alt+T",
                    "Control+Alt+M",
                    "CommandOrControl+Alt+M",
                    "Control+Alt+P",
                    "CommandOrControl+Alt+P",
                ];
                for s in global_shortcuts {
                    let _ = app.global_shortcut().register(s);
                }

                let quick_add_i = MenuItem::with_id(app, "quick_add", "新建待办 (Ctrl+Alt+K)", true, None::<&str>)?;
                let mini_i = MenuItem::with_id(app, "toggle_mini", "切换迷你便签 (Ctrl+Alt+M)", true, None::<&str>)?;
                let show_i = MenuItem::with_id(app, "show", "显示主窗口", true, None::<&str>)?;
                let quit_i = MenuItem::with_id(app, "quit", "退出应用", true, None::<&str>)?;
                let tray_menu = Menu::with_items(app, &[&quick_add_i, &mini_i, &show_i, &quit_i])?;

                if let Some(icon) = app.default_window_icon().cloned() {
                    let _tray = TrayIconBuilder::new()
                        .icon(icon)
                        .menu(&tray_menu)
                        .show_menu_on_left_click(false)
                        .on_tray_icon_event(|tray, event| {
                            if let TrayIconEvent::Click {
                                button: MouseButton::Left,
                                button_state: MouseButtonState::Up,
                                ..
                            } = event
                            {
                                let app = tray.app_handle();
                                if let Some(window) = app.get_webview_window("main") {
                                    let _ = window.unminimize();
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            }
                        })
                        .on_menu_event(|app, event| {
                            use tauri::Emitter;
                            match event.id.as_ref() {
                                "quick_add" => {
                                    if let Some(window) = app.get_webview_window("main") {
                                        let _ = window.unminimize();
                                        let _ = window.show();
                                        let _ = window.set_focus();
                                    }
                                    let _ = app.emit("tray-action", "quick_add");
                                }
                                "toggle_mini" => {
                                    let _ = app.emit("tray-action", "toggle_mini");
                                }
                                "show" => {
                                    if let Some(window) = app.get_webview_window("main") {
                                        let _ = window.unminimize();
                                        let _ = window.show();
                                        let _ = window.set_focus();
                                    }
                                }
                                "quit" => {
                                    app.exit(0);
                                }
                                _ => {}
                            }
                        })
                        .build(app)?;
                }

                Ok(())
            })
            .on_window_event(|window, event| {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    let _ = window.hide();
                    api.prevent_close();
                }
            });
    }

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
