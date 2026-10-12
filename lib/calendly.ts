const ASSESSMENT_URL = "https://calendly.com/hello-furnishedkeys/30min";

function encoded(params: Array<[string, string]>) {
  return params
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

export function assessmentCalendlyUrl(input: {
  name?: string;
  email?: string;
  campaign?: string;
}) {
  const name = input.name?.trim() ?? "";
  const email = input.email?.trim() ?? "";
  const campaign = input.campaign?.trim() || "site";
  const params: Array<[string, string]> = [];
  if (name) params.push(["name", name]);
  if (email) params.push(["email", email]);
  params.push(
    ["hide_gdpr_banner", "1"],
    ["background_color", "ffffff"],
    ["primary_color", "2e4a3b"],
    ["text_color", "1b1e1c"],
    ["utm_source", "furnishedkeys"],
    ["utm_medium", "assessment"],
    ["utm_campaign", campaign],
  );
  return `${ASSESSMENT_URL}?${encoded(params)}`;
}
