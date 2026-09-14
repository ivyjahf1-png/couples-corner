"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface UserOption {
  uid: string;
  email: string;
  displayName: string | null;
}

interface Props {
  selectedUid: string;
  onSearch: (query: string) => Promise<UserOption[]>;
}

export function AdminUserSelector({ selectedUid, onSearch }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSearch() {
    if (!query.trim() || query.length < 3) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const users = await onSearch(query.trim());
      setResults(users);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(uid: string) {
    router.push(`/admin/security?uid=${uid}`);
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-white mb-3">Select a user to inspect</h3>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by email or name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1 h-10 rounded-xl border border-orange-500/20 bg-slate-900 px-3 text-sm text-white focus:border-orange-500 focus:outline-none"
        />
        <Button onClick={handleSearch} disabled={loading || query.length < 3} size="sm">
          {loading ? "Searching…" : "Search"}
        </Button>
      </div>

      {selectedUid ? (
        <p className="mt-3 text-sm text-slate-300">
          Currently viewing user{" "}
          <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs">{selectedUid}</code>.
          Search for another to switch.
        </p>
      ) : null}

      {results.length > 0 && (
        <ul className="mt-4 space-y-2">
          {results.map((user) => (
            <li key={user.uid}>
              <button
                onClick={() => handleSelect(user.uid)}
                className="flex w-full items-center gap-3 rounded-xl border border-orange-500/20 bg-slate-900 p-3 text-left transition hover:bg-slate-800"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-orange-900/40 text-sm font-bold text-orange-400">
                  {user.displayName?.charAt(0).toUpperCase() ?? user.email.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-white">
                    {user.displayName ?? user.email}
                  </p>
                  <p className="text-sm text-slate-400">{user.email}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {query.length > 0 && query.length < 3 && (
        <p className="mt-2 text-xs text-slate-400">Type at least 3 characters to search.</p>
      )}
    </Card>
  );
}