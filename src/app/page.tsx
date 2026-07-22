import Link from "next/link";

export default function HomePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16 space-y-20">
      {/* Hero */}
      <section className="text-center space-y-6">
        <div className="text-7xl">🦈</div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900">
          Welcome to{" "}
          <span className="text-blue-600">WebSharkSocial</span>
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
          The social platform for{" "}
          <strong className="text-gray-800">WebShark.AI</strong> users,
          creatives, and builders. Share ideas, showcase your work, and connect
          with a community that&rsquo;s building the future.
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <Link
            href="/register"
            className="bg-blue-600 text-white font-semibold px-6 py-3 rounded-full hover:bg-blue-700 transition-colors text-lg"
          >
            Join the community
          </Link>
          <Link
            href="/explore"
            className="bg-white text-gray-700 font-semibold px-6 py-3 rounded-full border border-gray-300 hover:bg-gray-50 transition-colors text-lg"
          >
            Explore posts
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="grid sm:grid-cols-3 gap-8">
        {[
          {
            icon: "✍️",
            title: "Share your work",
            desc: "Post updates, showcase projects, and share insights with the community.",
          },
          {
            icon: "🤝",
            title: "Connect & collaborate",
            desc: "Follow creators and builders you admire. Build your network.",
          },
          {
            icon: "💡",
            title: "Discover ideas",
            desc: "Explore posts from across the WebShark.AI ecosystem. Get inspired.",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3 text-center"
          >
            <div className="text-4xl">{f.icon}</div>
            <h3 className="font-bold text-gray-900 text-lg">{f.title}</h3>
            <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="bg-blue-600 rounded-2xl p-10 text-center text-white space-y-4">
        <h2 className="text-2xl sm:text-3xl font-bold">Ready to dive in?</h2>
        <p className="text-blue-100">
          Create your free account and start connecting with the WebShark.AI
          community today.
        </p>
        <Link
          href="/register"
          className="inline-block bg-white text-blue-600 font-semibold px-6 py-3 rounded-full hover:bg-blue-50 transition-colors"
        >
          Get started for free
        </Link>
      </section>
    </div>
  );
}
