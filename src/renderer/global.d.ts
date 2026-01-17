// Electron webview type definitions
declare namespace JSX {
  interface IntrinsicElements {
    webview: React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        ref?: React.Ref<any>;
        src?: string;
        nodeintegration?: string;
        allowpopups?: string;
        preload?: string;
        partition?: string;
        httpreferrer?: string;
        useragent?: string;
        disablewebsecurity?: string;
        plugins?: string;
        autosize?: string;
        style?: React.CSSProperties;
      },
      HTMLElement
    >;
  }
}
