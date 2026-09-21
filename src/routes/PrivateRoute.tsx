import Sidebar from "../components/AppSidebar";

type PrivateRouteProps = {
  children: React.ReactNode;
};

function PrivateRoute({ children }: PrivateRouteProps) {
  return (
    <div className="min-h-screen bg-gray-950">
      <Sidebar />

      <main className="ml-64 min-h-screen min-w-0">{children}</main>
    </div>
  );
}

export default PrivateRoute;
