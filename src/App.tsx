import './App.css';
import { VideoCapture } from './components/VideoCapture';

function App() {
  return (
    <div className="bg-amber-200 h-screen w-screen flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-semibold">AI Desk Watch</h1>
      <VideoCapture />
    </div>
  );
}

export default App;
