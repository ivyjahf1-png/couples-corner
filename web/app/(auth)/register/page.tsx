  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-[calc(100vh_-_4rem)] w-full max-w-md flex-col justify-center px-4 py-16 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-2xl shadow-black/40">
          {/* Centred brand mark: the only top chrome on the card. */}
          <div className="flex justify-center py-6">
            <Link href="/" className="flex items-center" aria-label="Couples Corner home">
              <Logo as="span" />
            </Link>
          </div>

          {/* Dynamic illustration — loads from the admin panel's "auth" placement. */}
          <AuthIllustration />

          <div className="p-8">