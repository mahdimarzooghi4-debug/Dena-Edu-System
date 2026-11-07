package ir.dena.student;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.SslErrorHandler;
import android.net.http.SslError;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import java.io.ByteArrayInputStream;
import java.net.URI;

/**
 * Thin Android host for the Dena student experience.
 *
 * The Figma-aligned navigation, header and screens are rendered by the
 * first-party Dena student web app. This Activity must not add a second
 * toolbar or duplicate navigation around that experience.
 */
public final class MainActivity extends Activity {
    private URI startUri;
    private WebView webView;
    private LinearLayout errorPane;
    private TextView errorText;
    private Button retryButton;
    private ProgressBar progress;

    private static final int BG = Color.rgb(247, 246, 251);
    private static final int BRAND = Color.rgb(91, 76, 226);
    private static final int DARK = Color.rgb(43, 37, 68);

    private int dp(int amount) {
        return Math.round(amount * getResources().getDisplayMetrics().density);
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(BG);
        getWindow().setNavigationBarColor(BG);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        root.setBackgroundColor(BG);
        // Keep Android system bars outside the web content. The Dena web shell
        // owns its own Figma-aligned top bar and bottom navigation.
        root.setFitsSystemWindows(true);
        setContentView(root);

        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setMax(100);
        progress.setIndeterminate(false);
        progress.setProgressTintList(android.content.res.ColorStateList.valueOf(BRAND));
        progress.setVisibility(View.GONE);
        root.addView(progress, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, dp(2)));

        FrameLayout frame = new FrameLayout(this);
        root.addView(frame, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));

        errorPane = new LinearLayout(this);
        errorPane.setOrientation(LinearLayout.VERTICAL);
        errorPane.setGravity(Gravity.CENTER);
        errorPane.setPadding(dp(25), dp(25), dp(25), dp(25));
        errorPane.setBackgroundColor(BG);

        errorText = new TextView(this);
        errorText.setTextColor(DARK);
        errorText.setTextSize(16);
        errorText.setGravity(Gravity.CENTER);
        errorPane.addView(errorText, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        retryButton = new Button(this);
        retryButton.setText(getString(R.string.retry));
        retryButton.setOnClickListener(view -> {
            if (webView != null && startUri != null) {
                errorPane.setVisibility(View.GONE);
                webView.loadUrl(startUri.toString());
            }
        });
        LinearLayout.LayoutParams retryParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        retryParams.topMargin = dp(18);
        errorPane.addView(retryButton, retryParams);
        errorPane.setVisibility(View.GONE);

        try {
            startUri = AppAddress.validatedStart(BuildConfig.STUDENT_START_URL);
        } catch (IllegalArgumentException invalid) {
            showError(getString(R.string.configuration_missing), false);
            frame.addView(errorPane, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
            return;
        }
        if (startUri == null) {
            showError(getString(R.string.configuration_missing), false);
            frame.addView(errorPane, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
            return;
        }

        webView = new WebView(this);
        webView.setBackgroundColor(BG);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setVerticalScrollBarEnabled(false);
        frame.addView(webView, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        frame.addView(errorPane, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        configureWebView();
        webView.loadUrl(startUri.toString());
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setSafeBrowsingEnabled(true);

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                Uri destination = request.getUrl();
                if (AppAddress.sameOrigin(startUri, destination.toString())) return false;

                // External domains never inherit Dena's in-app web session.
                // Only an explicit user tap can open an outside HTTPS browser.
                if (request.hasGesture() && "https".equalsIgnoreCase(destination.getScheme())) {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, destination));
                    } catch (ActivityNotFoundException ignored) {
                        showError(getString(R.string.connection_error), true);
                    }
                }
                return true;
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(
                WebView view, WebResourceRequest request) {
                String scheme = request.getUrl().getScheme();
                if (!"https".equalsIgnoreCase(scheme)) return blocked();
                if (!AppAddress.sameOrigin(startUri, request.getUrl().toString())) return blocked();
                return null;
            }

            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) {
                errorPane.setVisibility(View.GONE);
                progress.setVisibility(View.VISIBLE);
                super.onPageStarted(view, url, icon);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                progress.setVisibility(View.GONE);
                super.onPageFinished(view, url);
            }

            @Override
            public void onReceivedError(
                WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    showError(getString(R.string.connection_error), true);
                }
            }

            @Override
            public void onReceivedHttpError(
                WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (request.isForMainFrame() && response.getStatusCode() >= 400) {
                    showError(getString(R.string.connection_error), true);
                }
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                handler.cancel();
                showError(getString(R.string.connection_error), true);
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progress.setProgress(newProgress);
                if (newProgress >= 100) progress.setVisibility(View.GONE);
            }

            @Override
            public void onPermissionRequest(PermissionRequest request) {
                // No runtime media permissions are granted by the Android shell.
                request.deny();
            }
        });
    }

    private static WebResourceResponse blocked() {
        return new WebResourceResponse("text/plain", "UTF-8",
            new ByteArrayInputStream(new byte[0]));
    }

    private void showError(String message, boolean retryable) {
        if (progress != null) progress.setVisibility(View.GONE);
        if (errorText != null) errorText.setText(message);
        if (retryButton != null) retryButton.setVisibility(retryable ? View.VISIBLE : View.GONE);
        if (errorPane != null) errorPane.setVisibility(View.VISIBLE);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
