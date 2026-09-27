import { useEffect, useMemo, useRef, useState } from "react";
import { analyticsOrigin } from "../../shared/productAnalytics";
import "./data-dashboard.css";

type Day = { date: string; visitors: number; sessions: number; events: number; successes: number; failures: number };
type ChannelSummary = {
  totals: Record<string, number>;
  rates: { generationSuccess: number | null; visitorToCreation: number | null; creatorToExport: number | null };
  daily: Day[];
  funnel: Array<{ key: string; label: string; value: number }>;
};
type Summary = {
  period: { days: number; channel: string; timezone: string; from: string; to: string };
  freshness: string | null;
  totals: Record<string, number>;
  rates: { generationSuccess: number | null; visitorToCreation: number | null; creatorToExport: number | null };
  daily: Day[];
  funnel: Array<{ key: string; label: string; value: number }>;
  breakdown: Record<"viral" | "jojo", ChannelSummary>;
  channels: Array<{ name: string; visitors: number; events: number }>;
  contract: { source: string; identity: string; exclusions: string[]; knownLimits: string[] };
};

const tokenKey = "ququ_data_token_v1";
const nav = [["overview", "概览"], ["trend", "趋势"], ["funnel", "转化"], ["quality", "数据说明"]] as const;

function percent(value: number | null) {
  return value === null ? "暂无" : `${Math.round(value * 100)}%`;
}

function dateTime(value: string | null) {
  return value ? new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "尚无事件";
}

function AccessGate({ onUnlock }: { onUnlock: (token: string) => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submittingRef = useRef(false);

  async function submit(next: string) {
    if (next.length !== 6 || submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${analyticsOrigin()}/auth`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: next })
      });
      const body = await response.json();
      if (!response.ok || !body.token) throw new Error(body.error || "暂时无法验证");
      sessionStorage.setItem(tokenKey, body.token);
      onUnlock(body.token);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "暂时无法验证");
      setPin("");
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  function update(next: string) {
    if (next.length > 6 || busy) return;
    setPin(next);
    if (next.length === 6) void submit(next);
  }

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (/^\d$/.test(event.key)) update(`${pin}${event.key}`);
      if (event.key === "Backspace") update(pin.slice(0, -1));
      if (event.key === "Escape") update("");
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [pin, busy]);

  return <main className="data-gate">
    <section className="data-gate-panel" aria-labelledby="gate-title">
      <p className="data-eyebrow">QUQU · 数据看板</p>
      <h1 id="gate-title">输入访问码</h1>
      <p>仅限运营查看。数据不包含聊天内容、Prompt 或真实身份。</p>
      <div className="pin-dots" aria-label={`已输入 ${pin.length} 位`}>
        {Array.from({ length: 6 }, (_, index) => <span key={index} className={index < pin.length ? "filled" : ""} />)}
      </div>
      <p className="pin-error" role="status">{busy ? "正在验证…" : error}</p>
      <div className="pin-pad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => <button key={number} onClick={() => update(`${pin}${number}`)}>{number}</button>)}
        <button className="pin-text" onClick={() => update("")}>清除</button>
        <button onClick={() => update(`${pin}0`)}>0</button>
        <button className="pin-text" onClick={() => update(pin.slice(0, -1))}>删除</button>
      </div>
    </section>
  </main>;
}

type TrendSeries = { channel: "viral" | "jojo"; label: string; days: Day[] };

function TrendChart({ series, metric }: { series: TrendSeries[]; metric: "visitors" | "successes" }) {
  const max = Math.max(1, ...series.flatMap(({ days }) => days.map((day) => day[metric])));
  const pointPosition = (value: number) => `${(value / max) * 78 + 8}%`;
  return <div className="trend-chart" role="img" aria-label={`${metric === "visitors" ? "访客" : "创作成功"}趋势`}>
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {series.map(({ channel, days }) => <polyline key={channel} className={`trend-line-${channel}`} points={days.map((day, index) => `${(index / Math.max(1, days.length - 1)) * 100},${92 - (day[metric] / max) * 78}`).join(" ")} />)}
    </svg>
    <div className="trend-points">{series.map(({ channel, days }) => days.map((day, index) => <button key={`${channel}-${day.date}`} className={`trend-point-${channel}`} style={{ left: `${(index / Math.max(1, days.length - 1)) * 100}%`, bottom: pointPosition(day[metric]) }} aria-label={`${channel === "viral" ? "微信版" : "钉钉版"} ${day.date}，${day[metric]}`} data-value={day[metric]} />))}</div>
    <div className="chart-axis"><span>{series[0]?.days[0]?.date.slice(5)}</span><span>{series[0]?.days.at(-1)?.date.slice(5)}</span></div>
  </div>;
}

export default function DataDashboard() {
  const [token, setToken] = useState(() => sessionStorage.getItem(tokenKey) || "");
  const [days, setDays] = useState(30);
  const [channel, setChannel] = useState("all");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [metric, setMetric] = useState<"visitors" | "successes">("visitors");
  const [activeSection, setActiveSection] = useState("overview");
  const sectionsRef = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (!token) return;
    setError("");
    fetch(`${analyticsOrigin()}/summary?days=${days}&channel=${channel}`, { credentials: "include", headers: { authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (response.status === 401) {
          sessionStorage.removeItem(tokenKey);
          setToken("");
          throw new Error("");
        }
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "数据加载失败");
        setSummary(body);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "数据加载失败"));
  }, [token, days, channel]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target.id) setActiveSection(visible.target.id);
    }, { rootMargin: "-18% 0px -62%", threshold: [0, 0.25, 0.6] });
    Object.values(sectionsRef.current).forEach((section) => section && observer.observe(section));
    return () => observer.disconnect();
  }, [summary]);

  const conclusions = useMemo(() => {
    if (!summary || !summary.totals.visitors) return ["埋点刚开始收集，目前还没有可分析的访问。", "数据出现后，这里会优先说明创作成功率与主要流失环节。"];
    const success = summary.rates.generationSuccess;
    const exportRate = summary.rates.creatorToExport;
    return [
      `近 ${days} 天有 ${summary.totals.visitors} 位匿名访客，其中 ${summary.funnel[1].value} 位完成过创作。`,
      success === null ? "还没有生成请求，暂时无法判断生成稳定性。" : `生成成功率为 ${percent(success)}，共成功 ${summary.totals.story_generation_succeeded} 次。`,
      exportRate === null ? "尚无完成创作的访客，暂时没有导出转化口径。" : `完成创作的访客中，${percent(exportRate)} 最终导出了存档或视频。`
    ];
  }, [summary, days]);

  const trendSeries = useMemo<TrendSeries[]>(() => {
    const channels: Array<"viral" | "jojo"> = channel === "all" ? ["viral", "jojo"] : [channel as "viral" | "jojo"];
    return channels.map((name) => ({ channel: name, label: name === "viral" ? "微信版" : "钉钉版", days: summary!.breakdown[name].daily }));
  }, [summary, channel]);

  const metricSets = useMemo(() => {
    const channels: Array<"viral" | "jojo"> = channel === "all" ? ["viral", "jojo"] : [channel as "viral" | "jojo"];
    return channels.map((name) => ({ name, label: name === "viral" ? "微信版" : "钉钉版", summary: summary!.breakdown[name] }));
  }, [summary, channel]);

  if (!token) return <AccessGate onUnlock={setToken} />;
  if (!summary) return <main className="data-loading"><p>{error || "正在读取腾讯云数据…"}</p></main>;

  return <div className="data-page">
    <header className="data-header">
      <div><p className="data-eyebrow">QUQU · 匿名产品分析</p><h1>创作数据看板</h1><p>北京时间 · 更新至 {dateTime(summary.freshness)}</p></div>
      <div className="data-filters" aria-label="数据范围">
        <label>周期<select value={days} onChange={(event) => setDays(Number(event.target.value))}><option value="7">近 7 天</option><option value="30">近 30 天</option><option value="90">近 90 天</option></select></label>
        <label>版本<select value={channel} onChange={(event) => setChannel(event.target.value)}><option value="all">全部</option><option value="viral">微信版</option><option value="jojo">钉钉版</option></select></label>
        {(days !== 30 || channel !== "all") && <button onClick={() => { setDays(30); setChannel("all"); }}>重置</button>}
      </div>
    </header>
    <nav className="data-nav" aria-label="看板章节">{nav.map(([id, label]) => <a key={id} className={activeSection === id ? "active" : ""} href={`#${id}`}>{label}</a>)}</nav>
    <main>
      <section id="overview" ref={(node) => { sectionsRef.current.overview = node; }} className="data-section data-intro">
        <div className="conclusions">{conclusions.map((sentence) => <p key={sentence}>{sentence}</p>)}</div>
        <div className="metric-strip">{metricSets.map(({ name, label, summary: channelSummary }) => <section className={`metric-set metric-set-${name}`} key={name} aria-label={`${label}指标`}>
          <h3>{label}</h3><dl className="metric-set-grid">
            <div><dt>匿名访客</dt><dd>{channelSummary.totals.visitors}</dd><small>去重浏览器标识</small></div>
            <div><dt>会话</dt><dd>{channelSummary.totals.sessions}</dd><small>会话标识</small></div>
            <div><dt>生成成功率</dt><dd>{percent(channelSummary.rates.generationSuccess)}</dd><small>成功 ÷ 发起</small></div>
            <div><dt>创作后导出</dt><dd>{percent(channelSummary.rates.creatorToExport)}</dd><small>导出访客 ÷ 创作访客</small></div>
          </dl>
        </section>)}</div>
      </section>
      <section id="trend" ref={(node) => { sectionsRef.current.trend = node; }} className="data-section">
        <div className="section-heading"><div><p className="data-eyebrow">趋势</p><h2>{metric === "visitors" ? "访问有没有持续发生" : "每天完成了多少次创作"}</h2><p>{metric === "visitors" ? "按北京时间统计每日匿名访客。" : "每次模型成功返回一段故事计为一次。"}</p></div>
          <div><div className="trend-legend"><span className="legend-viral">微信版</span><span className="legend-jojo">钉钉版</span></div><div className="data-tabs" role="tablist"><button role="tab" aria-selected={metric === "visitors"} onClick={() => setMetric("visitors")}>访客</button><button role="tab" aria-selected={metric === "successes"} onClick={() => setMetric("successes")}>创作成功</button></div></div></div>
        <TrendChart series={trendSeries} metric={metric} />
      </section>
      <section id="funnel" ref={(node) => { sectionsRef.current.funnel = node; }} className="data-section">
        <div className="section-heading"><div><p className="data-eyebrow">转化</p><h2>从访问到带走作品</h2><p>同一匿名访客在所选周期内完成过一次即计入下一步。</p></div></div>
        <div className="funnel-list">{summary.funnel.map((item, index) => {
          const baseline = summary.funnel[0]?.value || 1;
          return <div key={item.key}><span>{index + 1}</span><strong>{item.label}</strong><div><i style={{ width: `${Math.max(item.value ? 8 : 0, item.value / baseline * 100)}%` }} /></div><b>{item.value}</b></div>;
        })}</div>
      </section>
      <section id="quality" ref={(node) => { sectionsRef.current.quality = node; }} className="data-section data-quality">
        <div className="section-heading"><div><p className="data-eyebrow">数据说明</p><h2>这个看板能说明什么</h2><p>来源：{summary.contract.source} · 身份范围：{summary.contract.identity}</p></div></div>
        <div className="quality-columns"><div><h3>明确排除</h3>{summary.contract.exclusions.map((item) => <p key={item}>{item}</p>)}</div><div><h3>已知限制</h3>{summary.contract.knownLimits.map((item) => <p key={item}>{item}</p>)}</div></div>
      </section>
    </main>
    {error && <p className="data-error" role="alert">{error}</p>}
  </div>;
}
