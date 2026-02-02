import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LandingPage from "@/pages/LandingPage";
import ShirtLandingPage from "@/pages/ShirtLandingPage";
import HoodieLandingPage from "@/pages/HoodieLandingPage";
import PhotoTryOn from "@/pages/PhotoTryOn";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/shirts" component={ShirtLandingPage} />
      <Route path="/hoodies" component={HoodieLandingPage} />
      <Route path="/photo-try-on" component={PhotoTryOn} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
