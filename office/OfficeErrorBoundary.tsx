"use client";

import { Component, type ReactNode, type RefObject } from "react";

type Props = { host: RefObject<HTMLElement | null>; children: ReactNode };

/** If the 3D can't load or crashes, show the way to the content instead of a black screen. */
export default class OfficeErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[office] 3D scene failed, showing the fallback", error);
    this.props.host.current?.setAttribute("data-office-fallback", "true");
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="office-fallback" role="status">
        <p>The office didn&apos;t load. The work&apos;s still here though.</p>
        <p>
          <a href="/work">See the work</a> · <a href="/contact">Get in touch</a>
        </p>
      </div>
    );
  }
}
