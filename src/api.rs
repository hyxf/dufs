use anyhow::Result;
use serde::Serialize;
use std::collections::HashMap;

pub const API_QUERY: &str = "__dufs_api";
pub const API_VERSION: &str = "v1";

pub fn is_requested(params: &HashMap<String, String>) -> bool {
    params.contains_key(API_QUERY)
}

pub fn is_supported(params: &HashMap<String, String>) -> bool {
    params.get(API_QUERY).is_some_and(|version| version == API_VERSION)
}

/// Serializes a response for the JSON API without changing the legacy `?json` format.
pub fn encode<T: Serialize>(value: &T) -> Result<String> {
    Ok(serde_json::to_string(value)?)
}

pub fn encode_unsupported_version() -> Result<String> {
    encode(&serde_json::json!({ "error": { "code": "unsupported_api_version" } }))
}
