  return (
    <div className="flex min-h-[100dvh] flex-col bg-slate-950 text-white">
      <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-6 sm:px-6 sm:py-12 lg:py-16">
        <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-2xl shadow-black/40">
          {/* Centred brand mark: the only top chrome on the card. */}
          <div className="flex justify-center py-6">
            <Link href="/" className="flex items-center" aria-label="Couples Corner home">
              <Logo as="span" />
            </Link>
          </div>

          {/* Dynamic illustration — loads from the admin panel's "auth" placement. */}
          <AuthIllustration />

          <div className="p-5 sm:p-8">