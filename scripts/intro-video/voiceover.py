"""Generate the Hinglish voiceover lines for reel.html with an offline Piper Hindi voice (sherpa-onnx).

Setup (once):
  pip install sherpa-onnx soundfile
  curl -L -o v.tar.bz2 https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-hi_IN-pratham-medium.tar.bz2
  tar xjf v.tar.bz2
Usage:
  python3 scripts/intro-video/voiceover.py path/to/vits-piper-hi_IN-pratham-medium

Lines are written in Devanagari (English words spelled phonetically) so the Hindi voice pronounces them naturally.
"""
import os, sys
import sherpa_onnx
import soundfile as sf

LINES = [
    "नमस्ते! स्वागत है डिजि कॉन्नेक्ट दुकान में।",
    "आपकी हर डिजिटल सेवा, अब एक ही जगह।",
    "जी एस टी रजिस्ट्रेशन, आई टी आर फाइलिंग, इंश्योरेंस, पासपोर्ट, सिबिल रिपोर्ट, बैंकिंग और लोन, बिल पेमेंट, और पी वी सी कार्ड्स। सब कुछ ऑनलाइन।",
    "फास्ट और ईज़ी अप्लाई, डॉक्यूमेंट्स पूरी तरह सेफ, लाइव ट्रैकिंग, और पूरे इंडिया में एक्सपर्ट हेल्प।",
    "तो देर किस बात की? आज ही विज़िट करें, डिजि कॉन्नेक्ट दुकान डॉट कॉम। या कॉल करें, सेवन डबल ज़ीरो सेवन फाइव, नाइन फाइव नाइन थ्री वन।",
]

model_dir = sys.argv[1]
name = os.path.basename(model_dir.rstrip("/")).replace("vits-piper-", "")
tts = sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
    vits=sherpa_onnx.OfflineTtsVitsModelConfig(model=f"{model_dir}/{name}.onnx", tokens=f"{model_dir}/tokens.txt",
                                               data_dir=f"{model_dir}/espeak-ng-data"),
    num_threads=4)))
out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "voiceover")
os.makedirs(out_dir, exist_ok=True)
for i, line in enumerate(LINES, 1):
    audio = tts.generate(line, sid=0, speed=0.95)
    path = os.path.join(out_dir, f"line{i}.wav")
    sf.write(path, audio.samples, audio.sample_rate)
    print(path, round(len(audio.samples) / audio.sample_rate, 2), "s")
