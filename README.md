# AI Eva - Realtime Voice & Video Assistant 🤖✨

เอวา (Eva) คือ AI Assistant แบบ realtime ที่รองรับการสื่อสารด้วยเสียง วิดีโอ และข้อความ พัฒนาด้วย Google Gemini 2.0 Flash และ FastAPI + Next.js

## ✨ ฟีเจอร์หลัก

### 🎤 Voice & Audio
- **Realtime Voice Chat**: สนทนาด้วยเสียงแบบ realtime
- **Voice Visualization**: แสดงผล waveform และระดับเสียงแบบ realtime
- **Multi-device Support**: รองรับไมโครโฟนหลายตัว
- **Volume Control**: ปรับระดับเสียงได้
- **Voice Activity Detection**: ตรวจจับการพูดอัตโนมัติ

### 📹 Video Features
- **Camera Integration**: ใช้กล้องเว็บแคม
- **Screen Sharing**: แชร์หน้าจอ
- **Real-time Video Processing**: ส่งเฟรมวิดีโอไปยัง AI
- **Multi-camera Support**: รองรับกล้องหลายตัว

### 💬 Chat & Communication
- **Text Chat**: พิมพ์ข้อความสนทนา
- **Typing Indicators**: แสดงสถานะ "กำลังพิมพ์"
- **Message History**: บันทึกประวัติการสนทนา
- **Export Conversations**: ดาวน์โหลดบทสนทนา

### 🎥 YouTube Integration
- **Live Chat Monitoring**: ติดตาม YouTube Live Chat
- **Auto Response**: ตอบกลับ YouTube Chat อัตโนมัติ
- **Chat Filtering**: กรองข้อความที่ไม่เหมาะสม

### 🎨 UI/UX Features
- **Dark/Light Theme**: เปลี่ยนธีมได้
- **Responsive Design**: รองรับทุกหน้าจอ
- **Real-time Status**: แสดงสถานะการเชื่อมต่อ
- **Latency Monitoring**: วัดค่า ping/latency
- **Error Boundaries**: จัดการข้อผิดพลาด

## 🚀 การติดตั้ง

### Backend (Python)

```bash
cd backend
pip install -r requirements.txt

# สร้างไฟล์ .env
cp .env.example .env
# แก้ไข GEMINI_API_KEY ในไฟล์ .env

# รันเซิร์ฟเวอร์
python TestV1.py
```

### Frontend (Node.js)

```bash
cd frontend
npm install

# รันในโหมด development
npm run dev

# หรือ build สำหรับ production
npm run build
npm start
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
GEMINI_API_KEY=your_gemini_api_key_here
FRONTEND_URL=http://localhost:3000
DEBUG=false
HOST=0.0.0.0
PORT=8000
LOG_LEVEL=INFO
```

#### Frontend
การตั้งค่าจะถูกบันทึกใน localStorage อัตโนมัติ

### System Prompt
ปรับแต่ง personality ของ Eva ได้ผ่าน System Prompt ในหน้าเว็บ

## 📱 การใช้งาน

1. **เริ่มต้น**: กด "Start Chatting" เพื่อเริ่มสนทนา
2. **เสียง**: พูดเข้าไมค์ Eva จะตอบกลับด้วยเสียง
3. **วิดีโอ**: กด "Start with Video" หรือ "Share Screen"
4. **ข้อความ**: พิมพ์ข้อความในช่องด้านล่าง
5. **YouTube**: ใส่ URL YouTube Live เพื่อติดตาม chat

## 🛠 สถาปัตยกรรม

### Backend
- **FastAPI**: Web framework สำหรับ API
- **WebSocket**: การสื่อสารแบบ realtime
- **Google Gemini 2.0**: AI model
- **pytchat**: YouTube Live Chat monitoring

### Frontend  
- **Next.js 15**: React framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **shadcn/ui**: UI components
- **Web APIs**: MediaDevices, WebSocket, Canvas

### การจัดการ State
- **Custom Hooks**: useWebSocket, useAudioStream
- **Context API**: Theme management
- **Local Storage**: การบันทึกการตั้งค่า

## 🔒 Security Features

- **CORS Protection**: จำกัด origin ที่เข้าถึงได้
- **Input Validation**: ตรวจสอบข้อมูลนำเข้า
- **Error Handling**: จัดการข้อผิดพลาดอย่างปลอดภัย
- **Environment Variables**: แยกการตั้งค่าออกจาก code

## 🎯 Performance Optimizations

- **Component Splitting**: แยก components ให้เป็นระเบียบ
- **Memory Management**: จัดการ memory leaks
- **Audio Processing**: ประมวลผลเสียงแบบ stream
- **Error Boundaries**: ป้องกันการ crash ของแอป
- **Lazy Loading**: โหลดเฉพาะที่จำเป็น

## 🐛 การแก้ปัญหา

### ปัญหาทั่วไป

1. **ไมค์ไม่ทำงาน**: ตรวจสอบ permissions ของเบราว์เซอร์
2. **เชื่อมต่อไม่ได้**: ตรวจสอบ GEMINI_API_KEY
3. **เสียงไม่ออก**: ตรวจสอบการตั้งค่า volume
4. **กล้องไม่ทำงาน**: อนุญาต camera access

### Logs
ดู logs ใน:
- Backend: Console output
- Frontend: Browser DevTools

## 🤝 การพัฒนา

### Project Structure
```
├── backend/
│   ├── TestV1.py          # Main server
│   ├── requirements.txt   # Python dependencies
│   └── .env.example      # Environment template
└── frontend/
    ├── app/              # Next.js app directory
    ├── components/       # React components
    ├── hooks/           # Custom hooks
    ├── lib/             # Utilities
    ├── types/           # TypeScript types
    └── package.json     # Node dependencies
```

### การเพิ่มฟีเจอร์ใหม่
1. เพิ่ม component ใน `frontend/components/`
2. เพิ่ม types ใน `frontend/types/`
3. เพิ่ม API endpoint ใน `backend/TestV1.py`

## 📄 License

MIT License - ดูรายละเอียดใน LICENSE file

## 👥 Contributors

- [zone3577](https://github.com/zone3577) - Main Developer

## 🔮 Future Plans

- [ ] Mobile App (React Native)
- [ ] Voice Cloning
- [ ] Multi-language Support
- [ ] Plugin System
- [ ] Cloud Deployment
- [ ] Advanced Analytics

---

Made with ❤️ by zone3577
