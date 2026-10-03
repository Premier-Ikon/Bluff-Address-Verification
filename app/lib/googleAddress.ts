function mapsKey() {
  return String(process.env.GOOGLE_MAPS_API_KEY || "").trim();
}

function pickComponent(
  components: Array<{ long_name?: string; short_name?: string; types?: string[] }>,
  type: string,
  short = false
) {
  const item = (components || []).find((entry) => (entry.types || []).includes(type));
  if (!item) return "";
  return String(short ? item.short_name || "" : item.long_name || "").trim();
}

export type ConfirmedAddress = {
  address: string;
  address2: string;
  city: string;
  region: string;
  postal: string;
  country: string;
  formatted: string;
  placeId: string;
};

export async function suggestAddresses(input: string) {
  const key = mapsKey();
  if (!key) {
    return {
      ok: false as const,
      reason: "missing_key",
      suggestions: [] as Array<{ placeId: string; description: string }>,
    };
  }
  const query = String(input || "").trim();
  if (query.length < 3) {
    return { ok: true as const, suggestions: [] as Array<{ placeId: string; description: string }> };
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input", query);
  url.searchParams.set("types", "address");
  url.searchParams.set("key", key);

  const response = await fetch(url.toString(), { cache: "no-store" });
  const data = (await response.json().catch(() => ({}))) as {
    status?: string;
    error_message?: string;
    predictions?: Array<{ place_id?: string; description?: string }>;
  };

  if (data.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    return {
      ok: false as const,
      reason: data.error_message || data.status || "autocomplete_failed",
      suggestions: [] as Array<{ placeId: string; description: string }>,
    };
  }

  return {
    ok: true as const,
    suggestions: (data.predictions || [])
      .map((entry) => ({
        placeId: String(entry.place_id || "").trim(),
        description: String(entry.description || "").trim(),
      }))
      .filter((entry) => entry.placeId && entry.description)
      .slice(0, 6),
  };
}

export async function confirmAddress(placeId: string): Promise<
  | { ok: true; address: ConfirmedAddress }
  | { ok: false; reason: string }
> {
  const key = mapsKey();
  if (!key) return { ok: false, reason: "missing_key" };
  const id = String(placeId || "").trim();
  if (!id) return { ok: false, reason: "missing_place" };

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", id);
  url.searchParams.set("fields", "place_id,formatted_address,address_component");
  url.searchParams.set("key", key);

  const response = await fetch(url.toString(), { cache: "no-store" });
  const data = (await response.json().catch(() => ({}))) as {
    status?: string;
    error_message?: string;
    result?: {
      place_id?: string;
      formatted_address?: string;
      address_components?: Array<{ long_name?: string; short_name?: string; types?: string[] }>;
    };
  };

  if (data.status !== "OK" || !data.result) {
    return { ok: false, reason: data.error_message || data.status || "details_failed" };
  }

  const components = data.result.address_components || [];
  const number = pickComponent(components, "street_number");
  const route = pickComponent(components, "route");
  const address2 = pickComponent(components, "subpremise");
  const address = [number, route].filter(Boolean).join(" ");
  const city =
    pickComponent(components, "locality") ||
    pickComponent(components, "postal_town") ||
    pickComponent(components, "sublocality") ||
    pickComponent(components, "administrative_area_level_2");
  const region = pickComponent(components, "administrative_area_level_1", true);
  const postal = pickComponent(components, "postal_code");
  const country = pickComponent(components, "country") || "United States";
  const formatted = String(data.result.formatted_address || "").trim();

  if (!address && !formatted) return { ok: false, reason: "incomplete_address" };

  return {
    ok: true,
    address: {
      address: address || formatted,
      address2,
      city,
      region,
      postal,
      country,
      formatted:
        formatted ||
        [address, address2, city, region, postal, country].filter(Boolean).join(", "),
      placeId: String(data.result.place_id || id),
    },
  };
}
