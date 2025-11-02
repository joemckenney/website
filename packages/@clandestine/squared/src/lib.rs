use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn squared(n: f64) -> f64 {
    n * n
}
