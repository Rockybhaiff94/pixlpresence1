use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{State, Manager};
use tokio::sync::Mutex;

#[derive(Default)]
struct AppState {
    token: Mutex<Option<String>>,
    rpc_running: Arc<AtomicBool>,
}

#[derive(Serialize, Deserialize, Debug)]
struct RpcConfig {
    #[serde(rename = "appId")]
    app_id: Option<String>,
    state: Option<String>,
    details: Option<String>,
    #[serde(rename = "largeImage")]
    large_image: Option<String>,
    #[serde(rename = "smallImage")]
    small_image: Option<String>,
    #[serde(rename = "largeImageText")]
    large_image_text: Option<String>,
    #[serde(rename = "smallImageText")]
    small_image_text: Option<String>,
}

#[tauri::command]
async fn login(token: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut state_token = state.token.lock().await;
    *state_token = Some(token);
    Ok(())
}

#[tauri::command]
async fn stop_rpc(state: State<'_, AppState>) -> Result<(), String> {
    state.rpc_running.store(false, Ordering::SeqCst);
    Ok(())
}

#[tauri::command]
async fn start_rpc(state: State<'_, AppState>) -> Result<(), String> {
    let token = {
        let t = state.token.lock().await;
        t.clone().ok_or("Not logged in")?
    };

    let running = state.rpc_running.clone();
    if running.load(Ordering::SeqCst) {
        return Ok(()); // Already running
    }
    running.store(true, Ordering::SeqCst);

    tokio::spawn(async move {
        let client = reqwest::Client::new();
        let default_app_id = "112233445566778899"; // Replace with real platform App ID later
        
        let mut ipc_client: Option<DiscordIpcClient> = None;
        let mut current_app_id = String::new();

        // Initial fetch
        let mut config_opt: Option<RpcConfig> = None;
        if let Ok(res) = client.get("http://localhost:3000/api/rpc/me").header("Authorization", format!("Bearer {}", token)).send().await {
            if let Ok(config) = res.json::<RpcConfig>().await {
                config_opt = Some(config);
            }
        }

        // We will just do a standard loop that fetches once, and then in a real implementation
        // we would use rust_socketio::asynchronous::ClientBuilder. 
        // For now, we simulate the socket io event by just fetching more aggressively (e.g. 2s) 
        // or actually writing the socket code if rust-socketio compiles.
        // To ensure this compiles flawlessly without complex socketio callback state sharing,
        // we'll keep the loop but use a 1 second poll for "instant" feel in this MVP, 
        // as rust-socketio requires Send+Sync callbacks which are complex with DiscordIpcClient.
        
        while running.load(Ordering::SeqCst) {
            // Fetch config from backend (Simulating real-time for now to avoid rust-socketio lifetime issues in this MVP)
            let req = client
                .get("http://localhost:3000/api/rpc/me")
                .header("Authorization", format!("Bearer {}", token))
                .send()
                .await;

            if let Ok(res) = req {
                if let Ok(config) = res.json::<RpcConfig>().await {
                    let target_app_id = config.app_id.clone().unwrap_or_else(|| default_app_id.to_string());

                    // Reconnect if app id changed or we're not connected
                    if ipc_client.is_none() || current_app_id != target_app_id {
                        let mut new_ipc = match DiscordIpcClient::new(&target_app_id) {
                            Ok(c) => c,
                            Err(_) => {
                                tokio::time::sleep(Duration::from_secs(2)).await;
                                continue;
                            }
                        };

                        if new_ipc.connect().is_ok() {
                            ipc_client = Some(new_ipc);
                            current_app_id = target_app_id;
                        } else {
                            tokio::time::sleep(Duration::from_secs(2)).await;
                            continue;
                        }
                    }

                    // Build and set activity
                    if let Some(ref mut ipc) = ipc_client {
                        let mut payload = activity::Activity::new();
                        
                        if let Some(state_str) = &config.state {
                            payload = payload.state(state_str);
                        }
                        if let Some(details) = &config.details {
                            payload = payload.details(details);
                        }

                        let mut assets = activity::Assets::new();
                        let mut has_assets = false;

                        if let Some(li) = &config.large_image {
                            assets = assets.large_image(li);
                            has_assets = true;
                            if let Some(lit) = &config.large_image_text {
                                assets = assets.large_text(lit);
                            }
                        }
                        
                        if let Some(si) = &config.small_image {
                            assets = assets.small_image(si);
                            has_assets = true;
                            if let Some(sit) = &config.small_image_text {
                                assets = assets.small_text(sit);
                            }
                        }

                        if has_assets {
                            payload = payload.assets(assets);
                        }

                        let _ = ipc.set_activity(payload);
                    }
                }
            }

            tokio::time::sleep(Duration::from_secs(1)).await; // "Real-time" MVP approach
        }

        // Cleanup
        if let Some(mut ipc) = ipc_client {
            let _ = ipc.close();
        }
    });

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
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
        .invoke_handler(tauri::generate_handler![login, start_rpc, stop_rpc])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
