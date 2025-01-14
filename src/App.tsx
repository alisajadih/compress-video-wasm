import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { ChangeEvent, useRef, useState } from "react";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import "@picocss/pico/css/pico.min.css";
import VideoPlayer from "./components/VideoPlayer";

const presets = ["ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "veryslow"];

function App() {
  const [msg, setMsg] = useState("");
  const [resultUrl, setResultUrl] = useState("");

  const ffmpegRef = useRef(new FFmpeg());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewSelectedFile, setPreviewSelectedFile] = useState<string>();

  const [compressing, setCompressing] = useState(false);
  const [progress, setProgress] = useState(0);

  const [crf, setCrf] = useState(10);
  const [preset, setPreset] = useState<string>();

  //   const ffmpeg = createFFmpeg({
  //     log: true,
  //   });

  const compress = async () => {
    try {
      if (selectedFile && crf && preset) {
        setMsg("Loading ffmpeg-core.js");
        const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
        const ffmpeg = ffmpegRef.current;
        ffmpeg.on("log", ({ message }) => {});
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
        });

        setMsg("Loading file");
        ffmpeg.writeFile("input.mp4", await fetchFile(selectedFile));

        setMsg("File loaded, Starting compression");
        setCompressing(true);
        ffmpeg.on("progress", ({ progress }) => {
          setProgress(progress * 100);
        });
        await ffmpeg.exec([
          "-i",
          "input.mp4",
          "-threads",
          "1",
          "-c:v",
          "libx264",
          "-crf",
          String(crf),
          "-preset",
          preset,
          "output.mp4",
        ]);

        setMsg("Compression completed");
        const data = (await ffmpeg.readFile("output.mp4")) as any;
        const url = URL.createObjectURL(new Blob([data.buffer], { type: "video/mp4" }));

        console.log({ url });
        setResultUrl(url);
      }
    } catch (error) {
      setMsg("Error: " + String(error));
      console.log(error);
    } finally {
      setCompressing(false);
    }
  };

  const handleSelectFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files.item(0);
    if (file) {
      setSelectedFile(file);
      setPreviewSelectedFile(URL.createObjectURL(file));
    }
  };

  return (
    <main className="container">
      <div className="grid">
        <article>
          <header>
            <h3 style={{ margin: 0 }}>Input</h3>
          </header>
          <p style={{ margin: 0 }}>{msg}</p>
          <div>{previewSelectedFile && <VideoPlayer url={previewSelectedFile} />}</div>
          <input type="file" onChange={handleSelectFile} />
          <label htmlFor="crf">
            CRF (Lower means better quality) {crf}
            <input
              type="range"
              min="0"
              max="40"
              value={String(crf)}
              onChange={(e) => setCrf(Number(e.target.value))}
              id="crf"
              name="crf"
            />
          </label>
          <fieldset>
            <legend>Preset</legend>
            {presets.map((p) => (
              <label key={p} htmlFor={p}>
                <input
                  type="radio"
                  id={p}
                  value={p}
                  checked={p === preset}
                  onChange={(e) => e.target.checked && setPreset(p)}
                />
                {p}
              </label>
            ))}
          </fieldset>
          <div style={{ margin: "1em 0" }} />
          <button aria-busy={compressing} onClick={compress}>
            Compress
          </button>
          {compressing && <progress value={progress} max={100} />}
        </article>
        {resultUrl && (
          <article>
            <header>
              <h3 style={{ margin: 0 }}>Output</h3>
            </header>
            <a href={resultUrl} download>
              Download
            </a>
            <br />
            <video src={resultUrl} controls style={{ width: 480, height: 320 }} />
          </article>
        )}
      </div>
    </main>
  );
}

export default App;
