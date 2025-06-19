import ChatUI from "../components/chatui";
export default function Home(){
    return  <>
    <ChatUI setasollama={false} message={{
    name: "string",
    path: "set path here",
    is_dir: false,
    size: 999,
    rawfs: 999,
    lmdate: 999,
    timestamp: 999,
    foldercon: 999,
    ftype: "string",
    parent: "string",
  }}/>
    </>
}