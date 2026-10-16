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

                                // 快捷录入: Ctrl+Shift+K (Win/Linux) 或 Cmd+Shift+K (Mac) 或 Alt+Shift+K
                                if shortcut.matches(Modifiers::CONTROL | Modifiers::SHIFT, Code::KeyK)
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
                                // 唤起/隐藏主窗口: Ctrl+Shift+T / Cmd+Shift+T
                                else if shortcut.matches(Modifiers::CONTROL | Modifiers::SHIFT, Code::KeyT)
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
                                // 切换迷你便签: Ctrl+Shift+M / Cmd+Shift+M
                                else if shortcut.matches(Modifiers::CONTROL | Modifiers::SHIFT, Code::KeyM)
                                    || shortcut.matches(Modifiers::SUPER | Modifiers::SHIFT, Code::KeyM)
                                {
                                    if let Some(window) = app.get_webview_window("main") {
                                        let _ = window.unminimize();
                                        let _ = window.show();
                                        let _ = window.set_focus();
                                    }
                                    let _ = app.emit("shortcut-action", "toggle_mini");
                                }
                                // 番茄钟: Ctrl+Shift+P / Cmd+Shift+P
                                else if shortcut.matches(Modifiers::CONTROL | Modifiers::SHIFT, Code::KeyP)
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

                // 注册系统级全局快捷键
                let global_shortcuts = [
                    "CommandOrControl+Shift+K",
                    "Alt+Shift+K",
                    "CommandOrControl+Shift+T",
                    "CommandOrControl+Shift+M",
                    "CommandOrControl+Shift+P",
                ];
                for s in global_shortcuts {
                    let _ = app.global_shortcut().register(s);
                }

                let quick_add_i = MenuItem::with_id(app, "quick_add", "新建待办 (Ctrl/Cmd+Shift+K)", true, None::<&str>)?;
                let mini_i = MenuItem::with_id(app, "toggle_mini", "切换迷你便签模式", true, None::<&str>)?;
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
