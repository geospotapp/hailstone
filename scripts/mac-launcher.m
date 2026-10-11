#include <arpa/inet.h>
#include <mach-o/dyld.h>
#include <netinet/in.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/wait.h>
#include <unistd.h>

#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>

static const int kPort = 18765;
static pid_t server_pid = -1;

static void parent_dir(char *path) {
  char *slash = strrchr(path, '/');
  if (slash && slash != path) *slash = '\0';
}

static int port_open(void) {
  int fd = socket(AF_INET, SOCK_STREAM, 0);
  if (fd < 0) return 0;
  struct sockaddr_in addr;
  memset(&addr, 0, sizeof(addr));
  addr.sin_family = AF_INET;
  addr.sin_port = htons(kPort);
  inet_aton("127.0.0.1", &addr.sin_addr);
  int ok = connect(fd, (struct sockaddr *)&addr, sizeof(addr)) == 0;
  close(fd);
  return ok;
}

static void free_port(void) {
  FILE *fp = popen("/usr/sbin/lsof -tiTCP:18765 -sTCP:LISTEN", "r");
  if (!fp) return;
  char line[64];
  while (fgets(line, sizeof(line), fp)) {
    int pid = atoi(line);
    if (pid > 0 && pid != getpid()) kill(pid, SIGTERM);
  }
  pclose(fp);
  usleep(200000);
}

static int start_server(void) {
  char exe[4096];
  uint32_t size = sizeof(exe);
  if (_NSGetExecutablePath(exe, &size) != 0) return 1;
  char resolved[4096];
  if (realpath(exe, resolved)) {
    strncpy(exe, resolved, sizeof(exe) - 1);
    exe[sizeof(exe) - 1] = '\0';
  }
  parent_dir(exe);
  parent_dir(exe);
  char web[4600];
  snprintf(web, sizeof(web), "%s/Resources/web", exe);
  if (chdir(web) != 0) return 1;

  free_port();
  server_pid = fork();
  if (server_pid < 0) return 1;
  if (server_pid == 0) {
    execl("/usr/bin/python3", "python3", "-m", "http.server", "18765", "--bind",
          "127.0.0.1", (char *)NULL);
    _exit(127);
  }
  return 0;
}

static void install_menu(void) {
  NSMenu *menubar = [NSMenu new];

  NSMenuItem *appItem = [NSMenuItem new];
  [menubar addItem:appItem];
  NSMenu *appMenu = [[NSMenu alloc] initWithTitle:@"Hailstone"];
  [appMenu addItemWithTitle:@"Quit Hailstone" action:@selector(terminate:) keyEquivalent:@"q"];
  [appItem setSubmenu:appMenu];

  NSMenuItem *editItem = [NSMenuItem new];
  [menubar addItem:editItem];
  NSMenu *edit = [[NSMenu alloc] initWithTitle:@"Edit"];
  [edit addItemWithTitle:@"Undo" action:@selector(undo:) keyEquivalent:@"z"];
  [edit addItemWithTitle:@"Redo" action:@selector(redo:) keyEquivalent:@"Z"];
  [edit addItem:[NSMenuItem separatorItem]];
  [edit addItemWithTitle:@"Cut" action:@selector(cut:) keyEquivalent:@"x"];
  [edit addItemWithTitle:@"Copy" action:@selector(copy:) keyEquivalent:@"c"];
  [edit addItemWithTitle:@"Paste" action:@selector(paste:) keyEquivalent:@"v"];
  [edit addItemWithTitle:@"Select All" action:@selector(selectAll:) keyEquivalent:@"a"];
  [editItem setSubmenu:edit];

  [NSApp setMainMenu:menubar];
}

@interface AppDelegate : NSObject <NSApplicationDelegate>
@property(nonatomic, strong) NSWindow *window;
@property(nonatomic, strong) WKWebView *webView;
@property(nonatomic, assign) int loadAttempts;
@end

@implementation AppDelegate

- (void)applicationDidFinishLaunching:(NSNotification *)notification {
  (void)notification;
  NSColor *bg = [NSColor colorWithSRGBRed:0x14 / 255.0 green:0x14 / 255.0 blue:0x14 / 255.0 alpha:1];
  NSRect frame = NSMakeRect(0, 0, 1360, 920);
  NSWindow *window = [[NSWindow alloc]
      initWithContentRect:frame
                styleMask:NSWindowStyleMaskTitled | NSWindowStyleMaskClosable |
                          NSWindowStyleMaskMiniaturizable | NSWindowStyleMaskResizable
                  backing:NSBackingStoreBuffered
                    defer:NO];
  window.title = @"Hailstone";
  window.backgroundColor = bg;
  window.appearance = [NSAppearance appearanceNamed:NSAppearanceNameDarkAqua];
  [window center];

  WKWebViewConfiguration *config = [WKWebViewConfiguration new];
  WKWebView *web = [[WKWebView alloc] initWithFrame:window.contentView.bounds configuration:config];
  web.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
  if ([web respondsToSelector:@selector(setUnderPageBackgroundColor:)]) {
    web.underPageBackgroundColor = bg;
  }
  [window.contentView addSubview:web];
  self.window = window;
  self.webView = web;

  [window makeKeyAndOrderFront:nil];
  [NSApp activateIgnoringOtherApps:YES];
  [self loadWhenReady];
}

- (void)loadWhenReady {
  if (port_open()) {
    NSURL *url = [NSURL URLWithString:@"http://127.0.0.1:18765/"];
    [self.webView loadRequest:[NSURLRequest requestWithURL:url]];
    return;
  }
  if (self.loadAttempts++ > 50) return;
  [self performSelector:@selector(loadWhenReady) withObject:nil afterDelay:0.1];
}

- (BOOL)applicationShouldTerminateAfterLastWindowClosed:(NSApplication *)sender {
  (void)sender;
  return YES;
}

- (void)applicationWillTerminate:(NSNotification *)notification {
  (void)notification;
  if (server_pid > 0) {
    kill(server_pid, SIGTERM);
    waitpid(server_pid, NULL, WNOHANG);
  }
}

@end

int main(void) {
  if (start_server() != 0) return 1;
  @autoreleasepool {
    NSApplication *app = [NSApplication sharedApplication];
    [app setActivationPolicy:NSApplicationActivationPolicyRegular];
    install_menu();
    AppDelegate *delegate = [AppDelegate new];
    [app setDelegate:delegate];
    [app run];
  }
  return 0;
}
