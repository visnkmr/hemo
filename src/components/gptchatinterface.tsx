import { BotIcon, CheckIcon, Loader2, UserIcon, XIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
// import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import FileUploadComponent from "./FIleuploadfromremote";
import { useRouter } from 'next/router';
import { Textarea } from "./ui/textarea";
// import { invoke } from "@tauri-apps/api/tauri";
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { Checkbox } from "./ui/checkbox";
import { Markdown } from "./markdown";
// import { useDebounce } from "use-debounce";

// import MyComponent from "./route";
interface FileItem {
    name: string;
    path: string;
    is_dir: boolean;
    size: number;
    rawfs: number;
    lmdate: number;
    timestamp: number;
    foldercon: number;
    ftype: string;
    parent: string;
  }
// Interfaces
interface gptargs {
    message?: FileItem,
    fgptendpoint?: string,
    setasollama: boolean
    // localorremote:boolean
}

interface mitem {
    from: string
    message: string,
    time: string,
    timestamp: number
}

// Utility Functions
function getchattime() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes() < 10 ? '0' + now.getMinutes() : now.getMinutes();
    const seconds = now.getSeconds() < 10 ? '0' + now.getSeconds() : now.getSeconds();
    return `${hours}:${minutes}:${seconds}`;
}

function getchattimestamp() {
    return new Date().getTime();
}

// --- Hooks ---

/**
 * Custom hook to manage service status (Ollama and FiledimeGPT).
 */
const useServiceStatus = (fgptendpoint: string) => {
    const [ollamaisrunning, setoir] = useState(false);
    const [filedimegptisrunning, setfgir] = useState(false);
    const filegptHttpEndpoint = `http://${fgptendpoint}:8694`;
    const ollamaHttpEndpoint = `http://${fgptendpoint}:11434/`;

    const checkOllamaStatus = async () => {
        try {
            await axios.head(ollamaHttpEndpoint);
            setoir(true);
        } catch (error) {
            setoir(false);
        }
    };

    const checkFileDimeGptStatus = async () => {
        try {
            await axios.get(`${filegptHttpEndpoint}/`);
            setfgir(true);
        } catch (error) {
            setfgir(false);
        }
    };

    useEffect(() => {
        checkOllamaStatus();
        checkFileDimeGptStatus();
    }, [fgptendpoint, ollamaHttpEndpoint, filegptHttpEndpoint]);

    return { ollamaisrunning, filedimegptisrunning, checkOllamaStatus, checkFileDimeGptStatus };
};

/**
 * Custom hook to handle file embedding.
 */
const useEmbedding = (
    message: FileItem | undefined,
    filePaths: (string | null)[],
    filegptendpoint: string,
    setchathistory: React.Dispatch<React.SetStateAction<mitem[]>>,
    sao: React.Dispatch<React.SetStateAction<boolean>>,
    setcbs: React.Dispatch<React.SetStateAction<boolean>>
) => {
    const embed = async () => {
        if (message?.path) {
            console.log("embed");
            // if(localorremote){
            try {
                const response = await axios.post(`${filegptendpoint}/embed`, { files: filePaths });
                sao(false);
                setchathistory((old) => [...old, {
                    from: "bot",
                    message: `${message ? message.path : "The file(s)"} is ready for your questions`,
                    time: getchattime(),
                    timestamp: getchattimestamp()
                }]);
                setcbs(false);
                console.log(response.data);
            } catch (error) {
                setchathistory((old) => [...old, {
                    from: "bot",
                    message: `Issue finding Filegpt endpoint, maybe its not be running.`,
                    time: getchattime(),
                    timestamp: getchattimestamp()
                }]);
                console.error('Error:', error);
            }
            // }
        }
    };
    return { embed };
};

/**
 * Custom hook to handle chat data fetching via streaming.
 */
const useChatStream = (
    question: string,
    fgptendpoint: string,
    filedimegptisrunning: boolean,
    isollama: boolean,
    setmessage: React.Dispatch<React.SetStateAction<string>>,
    setchathistory: React.Dispatch<React.SetStateAction<mitem[]>>,
    setcbs: React.Dispatch<React.SetStateAction<boolean>>
) => {

    const filegptHttpEndpoint = `http://${fgptendpoint}:8694`;
    const ollamaHttpEndpoint = `http://${fgptendpoint}:11434`;

    const fetchOllamaStream = async () => {
        const requestBody = {
            "model": "qwen2.5:3b",
            "messages": [
                // {"role": "system", "content": "Always answer in rhymes."},
                { "role": "user", "content": question.replace("o2c", "") }
            ],
            "stream": true // Ensure streaming is enabled
        };

        fetch(`${ollamaHttpEndpoint}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        })
            .then(response => {
                const reader = response.body!.getReader();
                const decoder = new TextDecoder('utf-8');

                return reader.read().then(function processChunk({ done, value }): Promise<void> {
                    const chunk = decoder.decode(value).slice(5);
                    if (done || chunk.includes("[DONE]")) {
                        console.log('Stream complete');
                        setcbs(false); // Make sure to set cbs false on completion
                        return Promise.resolve();
                    }

                    try {
                        let resp = JSON.parse(chunk);
                        resp = resp.choices[0].delta.content;
                        if (resp) {
                            setmessage((old) => old + resp);
                        }
                    } catch (error) {
                        // Sometimes multiple JSON objects come in one chunk or incomplete ones
                        // Handle this gracefully or log if necessary. For now, we log.
                        console.error("Error parsing chunk:", error, "Chunk:", chunk);
                    }
                    return reader.read().then(processChunk);
                });
            })
            .catch(error => {
                setchathistory((old) => [...old, {
                    from: "bot",
                    message: `Issue finding Ollama ${ollamaHttpEndpoint} endpoint, maybe its not be running.`,
                    time: getchattime(),
                    timestamp: getchattimestamp()
                }]);
                console.error('Error reading stream:', error);
                setcbs(false);
            });
    };

    const fetchFileGPTStream = async () => {
        const abortController = new AbortController();
        const signal = abortController.signal;

        await fetchEventSource(`${filegptHttpEndpoint}/query-stream`, {
            signal: signal,
            method: "POST",
            body: JSON.stringify({
                query: question,
                where: question.toLocaleLowerCase().startsWith("generally") || isollama ? "ollama" : ""
            }),
            headers: { 'Content-Type': 'application/json', Accept: "text/event-stream" },
            onopen: async (res) => {
                if (res.ok && res.status === 200) {
                    setcbs(true);
                    console.log("Connection made ", res);
                } else if (res.status >= 400 && res.status < 500 && res.status !== 429) {
                    setcbs(false);
                    console.log("Client-side error ", res);
                }
            },
            onmessage: async (event) => {
                try {
                    let jp = JSON.parse(event.data);
                    setmessage((old) => old + jp.token);
                } catch (e) {
                     console.error("Error parsing event data:", e, "Data:", event.data);
                }
            },
            onclose: async () => {
                setcbs(false);
                console.log("Connection closed by the server");
            },
            onerror(err) {
                setchathistory((old) => [...old, {
                    from: "bot",
                    message: `Issue finding Filegpt endpoint ${filegptHttpEndpoint} endpoint, maybe its not be running.`,
                    time: getchattime(),
                    timestamp: getchattimestamp()
                }]);
                setcbs(false);
                console.error("There was an error from server", err);
                abortController.abort(); // Ensure we abort on error
               // throw "There was some issue with your filedimegpt instance. Is it not running?";
            },
        });
    };

    const fetchData = async () => {
        setcbs(true); // Set loading state true at the beginning
        if (question.toLocaleLowerCase().startsWith("o2c") || !filedimegptisrunning) {
            await fetchOllamaStream();
        } else {
            await fetchFileGPTStream();
        }
    };

    return { fetchData };
};


// --- Components ---

/**
 * Component to display the status of services.
 */
const ServiceStatus = ({ ollamaisrunning, filedimegptisrunning }: { ollamaisrunning: boolean, filedimegptisrunning: boolean }) => (
    <div className="flex flex-row p-2 gap-2 place-content-center">
        <div className="flex flex-row p-2 border-2 place-items-center">
            {ollamaisrunning ? <CheckIcon className="w-4 h-4" /> : <XIcon className="w-4 h-4" />} Ollama
        </div>
        <div className="flex flex-row p-2 border-2 place-items-center">
            {filedimegptisrunning ? <CheckIcon className="w-4 h-4" /> : <XIcon className="w-4 h-4" />} FiledimeGPT
        </div>
    </div>
);

/**
 * Component for handling Text-to-Speech button.
 */
const TTSButton = ({ text }: { text: string }) => {
    const handleListen = () => {
        const requestBody = {
            "text": text.toString(),
            "comments": "something here"
        };
        fetch(`http://127.0.0.1:8694/tts`, { // Consider making the TTS endpoint configurable
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        })
        .then(response => console.log(response))
        .catch(error => console.error('Error fetching TTS:', error));
    };

    return (
        <Button className="ml-4 text-black dark:text-white" variant={"outline"} onClick={handleListen}>
            Listen to this response
        </Button>
    );
};

/**
 * Component to display a single chat message.
 */
const ChatMessage = ({ item }: { item: mitem }) => (
    <div className="flex items-start gap-4">
        <div>
            {item.from === "you" ? (<UserIcon className="h-4 w-4" />) : (<BotIcon className="h-4 w-4" />)}
        </div>
        <div className="flex flex-col gap-1">
            <time className="text-xs text-gray-500 dark:text-gray-400">
                {item.time}
                <TTSButton text={item.message} />
            </time>
             {/* <p
              dangerouslySetInnerHTML={{
                __html: item.message.replace(/\n/g, '<br/>')
              }}
            ></p> */}
            <Markdown content={item.message} />
        </div>
    </div>
);

/**
 * Component to display the streaming bot message.
 */
const StreamingMessage = ({ message }: { message: string }) => (
    <div className="flex items-start gap-4">
        <div>
            <BotIcon className="h-4 w-4" />
        </div>
        <div className="flex flex-col gap-1">
            <time className="text-xs text-gray-500 dark:text-gray-400">{getchattime()}</time>
             {/* <p
              dangerouslySetInnerHTML={{
                __html: message.replace(/\n/g, '<br/>').replace("[DONESTREAM]","")
              }}
            ></p> */}
            <Markdown content={message.replace("[DONESTREAM]", "")} />
        </div>
    </div>
);


/**
 * Component to display the chat history and current message.
 */
const ChatHistory = ({ chathistory, onemessage, divRef }: { chathistory: mitem[], onemessage: string, divRef: React.RefObject<HTMLDivElement> }) => (
    <div className="overflow-auto grid gap-4 p-4 h-[70%] mb-5" >
        <div className="flex items-start gap-4 flex-col flex-grow" ref={divRef}>
            {chathistory.map((e) => (
                <ChatMessage key={e.timestamp} item={e} />
            ))}
            {onemessage !== "" && <StreamingMessage message={onemessage} />}
        </div>
    </div>
);

/**
 * Component for the chat input area.
 */
const ChatInput = ({ question, setq, handleSubmit, chatbuttonstate, autoscroll, setas }: {
    question: string,
    setq: (q: string) => void,
    handleSubmit: () => void,
    chatbuttonstate: boolean,
    autoscroll: boolean,
    setas: (a: (cv: boolean) => boolean) => void
}) => (
    <div className="p-4 border-t sticky bottom-0 bg-background"> {/* Added bg-background for better visibility */}
        <div className="flex gap-2">
            <Textarea
                className="flex-1"
                value={question}
                placeholder="Ask the file(s)..."
                onChange={(event) => setq(event.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }} // Added Enter to send
            />
            <Loader2 className={`${chatbuttonstate ? "h-4 w-4 animate-spin" : "hidden"}`} />
            <Button disabled={chatbuttonstate} onClick={handleSubmit}>Send</Button>
        </div>
        <div className="flex flex-row gap-2 p-2 m-2">
            <Checkbox id="autoscroll-checkbox" checked={autoscroll} onClick={() => setas((cv) => !cv)} />
             <label htmlFor="autoscroll-checkbox" className="text-sm">Autoscroll</label> {/* Improved a11y */}
        </div>
    </div>
);

// --- Main Component ---

export default function GPTchatinterface({ message, fgptendpoint = "localhost", setasollama = false }: gptargs) {
    // let sao=(value:boolean)=>{setasollama=value};
    const [isollama, sao] = useState(setasollama);

    // const [useollama,seto]=useState(setasollama)
    console.log("endpoint-->" + fgptendpoint);
    // const [time, setTime] = useState(new Date());
    // useEffect(() => {
    //   const timer = setInterval(() => {
    //     setTime(new Date());
    //   }, 1);

    //   // Clean up the interval when the component is unmounted
    //   return () => clearInterval(timer);
    // }, []);

    const [onemessage, setmessage] = useState("");
    // useEffect(()=>{
    //   if(onemessage.includes("[DONESTREAM]")){
    //         console.log("end-------------->"+onemessage)
    //         // setmessage("")
    //         }
    // },[onemessage])
    const [filePaths, setFilePaths] = useState([message ? message.path : null]);
    const [chathistory, setchathistory] = useState<mitem[]>([{
        from: "bot",
        message: message ? message.path : "Choose files to embed",
        time: getchattime(),
        timestamp: getchattimestamp()
    }]);
    // const [chathistorytemp, setchathistorytemp] = useState([] as mitem[]); // This state seems unused, can be removed? Kept for now as per instructions.
    const [chatbuttonstate, setcbs] = useState(false);
    const [question, setq] = useState("");
    const [filegptendpointState, setfge] = useState(`http://${fgptendpoint}:8694`); // Renamed to avoid conflict
    const [localorremote, setlor] = useState(message ? true : false); // If a message is passed, assume local/remote context

    // const [querystring, setqs] = useState([message.path]); // Unused

    const { ollamaisrunning, filedimegptisrunning, checkOllamaStatus, checkFileDimeGptStatus } = useServiceStatus(fgptendpoint);
    const { embed } = useEmbedding(message, filePaths, filegptendpointState, setchathistory, sao, setcbs);
    const { fetchData } = useChatStream(question, fgptendpoint, filedimegptisrunning, isollama, setmessage, setchathistory, setcbs);

    const divRef = useRef<HTMLDivElement>(null);
    const [autoscroll, setas] = useState(true); // Default to true

    const scrolltobottom = useCallback(() => {
        divRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, []);

    useEffect(() => {
        if (autoscroll) {
            const timer = setTimeout(scrolltobottom, 100); // Debounce a bit
             return () => clearTimeout(timer); // Cleanup timeout
        }
    }, [onemessage, chathistory, autoscroll, scrolltobottom]); // Add chathistory as dep

    const handleSubmit = async () => {
        if (question.trim() === "") return; // Prevent sending empty messages

        // Add previous bot message to history if it exists
        if (onemessage.trim() !== "") {
            setchathistory((old) => [...old, {
                from: "bot",
                message: onemessage.replace("[DONESTREAM]", ""),
                time: getchattime(),
                timestamp: getchattimestamp()
            }]);
        }

        // Add user question to history
        setchathistory((old) => [...old, {
            from: "you",
            message: `${question}`,
            time: getchattime(),
            timestamp: getchattimestamp()
        }]);

        //   const sendreq=async ()=>{
        //     try {
        //       setcbs(false)
        //       const response =  await axios.post(`${filegptendpointState}/retrieve`, { query: question });
        //       console.log(response.data['results']);
        //       setchathistory((old)=>[...old,
        //         {
        //           from:"bot",
        //         message:`${response.data['results']}`,
        //         time:getchattime(),
        //         timestamp:getchattimestamp()
        //       }
        //     ])
        //       setcbs(true)
        //   } catch (error) {
        //     setcbs(true)
        //     console.error('Error:', error);
        //   }
        // }
        // sendreq();

        setmessage(""); // Clear current streaming message
        setq(""); // Clear input
        fetchData(); // Fetch new response
    };

    useEffect(() => {
        embed();
        // if(!fgptendpoint){
        //   let url=typeof window !== 'undefined' ? window.location.hostname : '/'
        //   setfge(url)
        //   // invoke("filegptendpoint",{
        //   //   endpoint:""
        //   // }).then((e)=>{
        //   //   console.log(e)
        //   //   setfge(e)
        //   //   setlor(()=>{
        //   //     (e as string).includes("localhost")?embed():null;
        //   //     return (e as string).includes("localhost")
        //   //   })
        //   // })
        // }
        // else
        {
            setfge(`http://${fgptendpoint}:8694`);
        }
        checkFileDimeGptStatus(); //check if filedimegpt is running
        checkOllamaStatus(); //check if ollama is running
        // console.log("-----------------"+filegptendpoint+"-----------------")
    }, [fgptendpoint, embed, checkFileDimeGptStatus, checkOllamaStatus]); // Add dependencies

    const [cmsg, setcmsg] = useState("");
    useEffect(() => {
        console.log(cmsg);
        if (cmsg !== "") {
            setchathistory((old) => [...old, {
                from: "bot",
                message: cmsg,
                time: getchattime(),
                timestamp: getchattimestamp()
            }]);
            setcmsg(""); // Clear after adding
        }
    }, [cmsg]);

    // useEffect(() => {
    //     console.log(setasollama); // This likely logs the original prop, not the state.
    // }, [setasollama]);
    // useEffect(() => {
    //     console.log("Is Ollama:", isollama); // Log the state instead
    // }, [isollama]);

    return (
        <div className="flex flex-col h-full"> {/* Ensure container takes full height */}
            {/* <MyComponent/> */}
            {/* {time.toLocaleString()} */}
            <ServiceStatus ollamaisrunning={ollamaisrunning} filedimegptisrunning={filedimegptisrunning} />

            {localorremote ? (
                <h1 className="flex flex-row gap-2 p-2 justify-center"> {/* Added padding and centering */}
                    <BotIcon className="h-4 w-4" />FileGPT : {message ? message.path : null}
                </h1>
            ) : (
                <FileUploadComponent fge={filegptendpointState} setcmsg={setcmsg} setasollama={sao} />
            )}

            <div className="flex-grow overflow-hidden"> {/* Make chat history grow and handle overflow */}
                <ChatHistory chathistory={chathistory} onemessage={onemessage} divRef={divRef} />
            </div>

            <ChatInput
                question={question}
                setq={setq}
                handleSubmit={handleSubmit}
                chatbuttonstate={chatbuttonstate}
                autoscroll={autoscroll}
                setas={() => setas(cv => !cv)} // Pass the update function directly
            />
        </div>
    );
}