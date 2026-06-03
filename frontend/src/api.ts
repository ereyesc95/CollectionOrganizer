import type {
  ArtworkListResponse,
  AudioTracksResponse,
  Facets,
  ImportResult,
  ParsePreview,
  Record,
  RecordList,
} from "./types";

const API = "/api";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text();
    try {
      const body = JSON.parse(text) as { detail?: string | { msg: string }[] };
      if (typeof body.detail === "string") throw new Error(body.detail);
      if (Array.isArray(body.detail) && body.detail[0]?.msg) {
        throw new Error(body.detail.map((d) => d.msg).join(", "));
      }
    } catch (e) {
      if (e instanceof Error && e.message !== text) throw e;
    }
    throw new Error(text || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function fetchFacets(): Promise<Facets> {
  const data = await request<Omit<Facets, "artist"> & { artist?: Facets["artist"] }>(
    `${API}/records/facets`
  );
  return { ...data, artist: data.artist ?? [] };
}

export async function fetchRecords(params: URLSearchParams): Promise<RecordList> {
  return request(`${API}/records?${params}`);
}

export async function fetchRecord(id: number): Promise<Record> {
  return request(`${API}/records/${id}`);
}

export async function createRecord(body: object): Promise<Record> {
  return request(`${API}/records`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function updateRecord(id: number, body: object): Promise<Record> {
  return request(`${API}/records/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function deleteRecord(id: number): Promise<void> {
  return request(`${API}/records/${id}`, { method: "DELETE" });
}

export async function parsePreview(coverKey: string): Promise<ParsePreview> {
  return request(
    `${API}/records/parse-preview?${new URLSearchParams({ cover_key: coverKey })}`
  );
}

export async function getSettings(): Promise<{
  source_folder: string;
  covers_folder: string;
  animations_folder: string;
  autographs_folder: string;
}> {
  return request(`${API}/settings`);
}

export async function updateSettings(covers_folder: string): Promise<{ covers_folder: string }> {
  return request(`${API}/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ covers_folder }),
  });
}

export async function importExcel(replace = false): Promise<ImportResult> {
  return request(`${API}/import/excel?replace=${replace}`, { method: "POST" });
}

export async function browseCoversFolder(): Promise<{ path: string; selected: boolean }> {
  return request(`${API}/settings/browse-covers-folder`, { method: "POST" });
}

export async function browseAnimationsFolder(): Promise<{ path: string; selected: boolean }> {
  return request(`${API}/settings/browse-animations-folder`, { method: "POST" });
}

export async function browseAutographsFolder(): Promise<{ path: string; selected: boolean }> {
  return request(`${API}/settings/browse-autographs-folder`, { method: "POST" });
}

export async function browseSourceFolder(): Promise<{
  path: string;
  selected: boolean;
  missing_subfolders: string[];
}> {
  return request(`${API}/settings/browse-source-folder`, { method: "POST" });
}

export async function uploadAutographPhoto(recordId: number, file: File): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API}/autographs/${recordId}`, { method: "POST", body: form });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
}

export async function deleteAutographPhoto(recordId: number): Promise<void> {
  return request(`${API}/autographs/${recordId}`, { method: "DELETE" });
}

export async function browseAutographFile(
  recordId: number
): Promise<{ selected: boolean; has_photo: boolean }> {
  return request(`${API}/autographs/${recordId}/browse-file`, { method: "POST" });
}

export async function fetchAudioTracks(recordId: number): Promise<AudioTracksResponse> {
  return request(`${API}/audio/${recordId}/tracks`);
}

export async function fetchArtwork(recordId: number): Promise<ArtworkListResponse> {
  return request(`${API}/audio/${recordId}/artwork`);
}
