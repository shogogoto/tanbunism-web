import {
  BookOpen,
  Mail,
  MessageCircle,
  Network,
  Search,
  Share2,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router";
import { useAuth } from "~/features/auth/AuthProvider";

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [activeFeature, setActiveFeature] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const problems = [
    {
      icon: <Search className="w-6 h-6" />,
      title: "重要な内容はどこ？",
      description:
        "長い文章の中で、本当に重要なポイントを見つけるのに時間がかかる",
    },
    {
      icon: <Network className="w-6 h-6" />,
      title: "この内容がどこに繋がるの？",
      description: "現在読んでいる情報の位置づけや関連性が分からない",
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "どこまで勉強すればいいの？",
      description: "理解に必要な学習範囲や深さが不透明で効率が悪い",
    },
  ];

  const solutions = [
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: "単文主義",
      description:
        "長文の複雑さを排除し、一つの文で一つの概念を表現。理解コストを最小化します。",
    },
    {
      icon: <Network className="w-6 h-6" />,
      title: "グラフ構造",
      description:
        "単文を繋ぐネットワーク構造によって接続詞の冗長さを排除し、知識を簡潔に表現。",
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "スコアリング",
      description:
        "繋がりのカウントによって単文の重要度を数値化し、重要度を可視化、検索可能。",
    },
  ];

  const snsFeatures = [
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: "ピンポイントな単文引用",
      description: "効率的なディスカッションを実現する精密な引用機能",
    },
    {
      icon: <Share2 className="w-6 h-6" />,
      title: "単文の再利用コラボレーション",
      description: "他メモの単文をimportする新しい形のコラボレーション",
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "興味を細部まで表現",
      description: "細かな興味関心を通じて同じ志向の人と繋がれる",
    },
  ];

  const handleNavigation = (path: string) => {
    // In a real app, this would use a router
    console.log(`Navigating to: ${path}`);
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 text-white overflow-hidden">
      {/* Background Animation */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4">
        <div className="max-w-6xl mx-auto text-center relative">
          <div
            className="transform transition-transform duration-700"
            style={{ transform: `translateY(${scrollY * 0.1}px)` }}
          >
            <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
              tanbunism
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-300 max-w-3xl mx-auto leading-relaxed">
              <span className="text-purple-400 font-semibold">単文主義</span>
              で知識を構造化する
              <br />
              知識管理プラットフォーム
            </p>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-gray-400 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-gray-400 rounded-full mt-2 animate-pulse" />
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 px-4 relative">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-8">
            文章を理解するのって<span className="text-red-400">大変</span>！
          </h2>
          <p className="text-xl text-gray-300 text-center mb-16 max-w-2xl mx-auto">
            日々の学習や情報収集で、こんな悩みを感じたことはありませんか？
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {problems.map((problem) => (
              <div
                key={problem.title}
                className="p-6 bg-red-500/10 border border-red-500/30 rounded-2xl backdrop-blur-sm hover:bg-red-500/15 transition-all duration-300"
              >
                <div className="text-red-400 mb-4">{problem.icon}</div>
                <h3 className="text-xl font-semibold mb-3 text-red-300">
                  {problem.title}
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {problem.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 px-4 relative">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
            <span className="text-purple-400">単文主義</span>の革命
          </h2>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {solutions.map((solution, index) => (
              <div
                key={solution.title}
                className={`p-6 rounded-2xl backdrop-blur-sm border transition-all duration-300 cursor-pointer ${
                  activeFeature === index
                    ? "bg-white/20 border-purple-400 scale-105"
                    : "bg-white/5 border-gray-600 hover:bg-white/10"
                }`}
                onMouseEnter={() => setActiveFeature(index)}
              >
                <div className="text-purple-400 mb-4">{solution.icon}</div>
                <h3 className="text-xl font-semibold mb-3">{solution.title}</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {solution.description}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link
              type="button"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-400 rounded-xl text-lg font-medium hover:from-purple-600/30 hover:to-blue-600/30 transition-all duration-200"
              to="/docs/concept"
            >
              より詳細なコンセプトの説明はこちら
            </Link>
          </div>
        </div>
      </section>

      {/* SNS Features Section */}
      <section className="py-20 px-4 relative">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-8">
            <span className="text-purple-400">単文主義</span> ×{" "}
            <span className="text-blue-400">SNS</span>
          </h2>
          <p className="text-xl text-gray-300 text-center mb-16 max-w-3xl mx-auto">
            単文の精密さを活かした、新しいコミュニケーションの形
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {snsFeatures.map((feature) => (
              <div
                key={feature.title}
                className="p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-2xl backdrop-blur-sm hover:from-blue-500/15 hover:to-purple-500/15 transition-all duration-300"
              >
                <div className="text-blue-400 mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 relative">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8">
            知識の新しい時代を
            <br />
            一緒に始めませんか？
          </h2>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
            単文主義で構造化された知識管理の革命に参加して、
            より効率的で明確な思考を手に入れましょう。
          </p>

          <div className="grid md:grid-cols-2 gap-4 mb-12 max-w-2xl mx-auto">
            <Link
              type="button"
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-lg font-medium hover:from-purple-700 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
              to="register"
            >
              新規登録してみよう！
            </Link>
            <Link
              type="button"
              className="px-8 py-4 bg-gradient-to-r from-green-600 to-teal-600 rounded-xl text-lg font-medium hover:from-green-700 hover:to-teal-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
              to="/search"
            >
              検索してみよう！
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link
              type="button"
              className="px-6 py-3 border border-gray-400 rounded-xl font-medium hover:bg-white/10 transition-all duration-200"
              to="/docs/get-started"
            >
              始め方について
            </Link>
            <Link
              type="button"
              className="px-6 py-3 border border-gray-400 rounded-xl font-medium hover:bg-white/10 transition-all duration-200"
              to="/contact"
            >
              問い合わせはこちら
            </Link>
          </div>

          {/* Social Links */}
          <div className="flex justify-center space-x-6">
            <button
              type="button"
              className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-all duration-200"
            >
              <img
                alt="GitHub"
                height="32"
                width="32"
                src="https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/github.svg"
              />
            </button>
            <button
              type="button"
              className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-all duration-200"
            >
              <img
                alt="X"
                height="32"
                width="32"
                src="https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/x.svg"
              />
            </button>
            <button
              type="button"
              className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-all duration-200"
            >
              <Mail className="w-6 h-6" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-gray-700">
        <div className="max-w-6xl mx-auto text-center">
          <h3 className="text-2xl font-bold mb-4">tanbunism</h3>
          <p className="text-gray-400 mb-6">
            単文主義で知識を構造化する知識管理プラットフォーム
          </p>
          <div className="text-sm text-gray-500">
            © 2025 tanbunism. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
