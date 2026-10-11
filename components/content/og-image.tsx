import { ImageResponse } from "next/og";

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

function titleLines(title: string, max = 34): string[] {
  const words = title.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > max && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function postSocialImage(title: string, category: string) {
  const lines = titleLines(title);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#faf8f4",
          color: "#1b1e1c",
        }}
      >
        <div style={{ display: "flex", height: 12, backgroundColor: "#2e4a3b" }} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            padding: "64px 72px",
          }}
        >
          <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, color: "#62675f" }}>
            FURNISHED KEYS
          </div>
          <div style={{ display: "flex", marginTop: 36, fontSize: 24, color: "#2e4a3b" }}>{category}</div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 18 }}>
            {lines.map((line, index) => (
              <div key={index} style={{ display: "flex", fontSize: 52, lineHeight: 1.15 }}>
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...ogSize },
  );
}
