"use client";

import Icon from "./ui/Icon";
import { Eyebrow } from "./ui/Pill";

export default function BusinessCase({ onAskResona }: { onAskResona: () => void }) {
  return (
    <div className="case">
      <Eyebrow>The business case</Eyebrow>
      <h1>
        A voicebot for tier-one <em>customer service.</em>
      </h1>
      <p className="lead">
        Customer service costs are climbing while CSAT is flat. This case
        proposes a voicebot that handles tier-one inquiries end to end — and
        outlines what it costs, what it saves, and what could go wrong.
      </p>

      <section>
        <Eyebrow>01 · Problem</Eyebrow>
        <h2>
          The queue compounds <em>at peak hours.</em>
        </h2>
        <p>
          Average handle time has crept past nine minutes. Forty-one percent of
          inbound volume is repeat questions our existing IVR can&apos;t route —
          order status, return policy, plan changes, password resets. Agents
          are doing rote work, and CSAT during peak hours drops twelve points
          below the daily average.
        </p>
        <p className="secondary">
          The cost is not only in headcount. Repeated low-complexity calls
          erode agent retention; tenure on the floor has shrunk from eighteen
          months to nine in two years.
        </p>
      </section>

      <section>
        <Eyebrow>02 · Solution</Eyebrow>
        <h2>
          A voicebot that <em>actually answers.</em>
        </h2>
        <p>
          The INSEAD voicebot is a realtime voice agent built on a tier-one LLM,
          grounded in our existing knowledge base and policy documents. It speaks
          naturally, hands off cleanly to a human when it can&apos;t help, and
          writes a structured summary into the CRM for every call.
        </p>
        <p>
          The proposed deployment covers four call types in phase one: order
          status, returns, plan changes, password resets. These represent
          sixty-eight percent of current tier-one volume.
        </p>

        <h3>What it handles end-to-end</h3>
        <p className="secondary">
          Order status, returns and exchanges, simple plan changes, account
          recovery, store-hours and location lookups.
        </p>

        <h3>What it escalates</h3>
        <p className="secondary">
          Billing disputes, complaints, anything where the customer asks for a
          person, anything outside the four phase-one categories.
        </p>
      </section>

      <section>
        <Eyebrow>03 · Numbers</Eyebrow>
        <h2>The economics, in three numbers.</h2>
        <div className="case-kpis">
          <div className="kpi">
            <div className="num">
              62<em>%</em>
            </div>
            <div className="desc">
              Tier-one inquiries fully resolved by the bot in year one.
            </div>
          </div>
          <div className="kpi">
            <div className="num">
              2.7<em>×</em>
            </div>
            <div className="desc">
              Return on the implementation cost in twelve months.
            </div>
          </div>
          <div className="kpi">
            <div className="num">
              €840<em>K</em>
            </div>
            <div className="desc">
              Net savings in year one, against €310K to build and deploy.
            </div>
          </div>
        </div>
        <p className="secondary" style={{ marginTop: 24 }}>
          Savings assume an average loaded agent cost of €38/hour and a
          3.2-minute average handled call for the bot at a marginal infra cost
          of €0.18 per call. Sensitivity analysis with ±20% on each input keeps
          ROI above 1.8×.
        </p>

        <div className="pullquote">
          &ldquo;We&apos;re not removing agents. We&apos;re freeing them from
          work that was making them quit.&rdquo;
        </div>
      </section>

      <section>
        <Eyebrow>04 · Risks</Eyebrow>
        <h2>What could go wrong, ranked.</h2>
        <ul className="risk-list">
          <li>
            <span className="risk-n">01</span>
            <span className="risk-t">
              Customer trust in voice AI
              <small>
                Some segments — particularly customers over sixty — explicitly
                prefer human contact. We mitigate with a clear opt-out in the
                first five seconds of every call.
              </small>
            </span>
            <span className="risk-l high">High</span>
          </li>
          <li>
            <span className="risk-n">02</span>
            <span className="risk-t">
              Hallucinated policy answers
              <small>
                Retrieval-grounded responses with mandatory citation to source
                documents; any answer not grounded in source returns &ldquo;let
                me transfer you to an agent.&rdquo;
              </small>
            </span>
            <span className="risk-l high">High</span>
          </li>
          <li>
            <span className="risk-n">03</span>
            <span className="risk-t">
              Latency in realtime turn-taking
              <small>
                Above 700ms feels unnatural. Vendor SLA targets 350ms; load
                testing required pre-launch.
              </small>
            </span>
            <span className="risk-l med">Medium</span>
          </li>
          <li>
            <span className="risk-n">04</span>
            <span className="risk-t">
              Vendor lock-in on the voice model
              <small>
                Adapter layer abstracts the realtime provider; switching cost
                estimated at two weeks of engineering.
              </small>
            </span>
            <span className="risk-l med">Medium</span>
          </li>
          <li>
            <span className="risk-n">05</span>
            <span className="risk-t">
              Agent role redefinition
              <small>
                Tier-one becomes tier-two by default. Requires re-training
                program and a new compensation band; HR signed off.
              </small>
            </span>
            <span className="risk-l med">Medium</span>
          </li>
        </ul>
      </section>

      <section>
        <Eyebrow>05 · Recommendation</Eyebrow>
        <h2>Build a pilot. Six months, one call type.</h2>
        <p>
          Start with order-status calls — the highest volume, the lowest risk,
          the easiest to evaluate. Three months to build and integrate. Three
          months in production with a 20% traffic ramp. If the pilot hits its
          three KPIs (resolution ≥ 75%, CSAT delta ≤ 5 points, cost per call
          ≤ €0.40), expand to the remaining three call types in year two.
        </p>
      </section>

      <div className="ask-resona">
        <div className="mini-orb" />
        <p>
          Rather hear this out loud?
          <small>
            The voicebot can walk you through any section in about ninety
            seconds.
          </small>
        </p>
        <button className="btn btn-primary" onClick={onAskResona}>
          <Icon name="mic" size={16} />
          Ask the voicebot
        </button>
      </div>
    </div>
  );
}
