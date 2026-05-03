// Shared utility for translating text via Google Translate free API
export async function translateText(text: string, targetLang: string = "vi"): Promise<string> {
  if (!text) return "";
  
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error("Translation failed");
    }
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data[0].map((item: any) => item[0]).join('');
  } catch (err) {
    console.error("Translation error:", err);
    throw err;
  }
}
