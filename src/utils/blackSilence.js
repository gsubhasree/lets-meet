//to silence audio of muted user
export function silence(){
    //returns a new AudioContext object.
    let ctx = new AudioContext()
    //creates an OscillatorNode, a source representing a periodic waveform
    let oscillator = ctx.createOscillator()
    //creates a new MediaStreamAudioDestinationNode object associated with a WebRTC
    let dst = oscillator.connect(ctx.createMediaStreamDestination())
    oscillator.start()
    ctx.resume()
    //disables the audio stream and return
    return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false })
}

//turn off video and display black color
export function black({ width = 640, height = 480 } = {}){
    //creates a canvas element at the place where video of user was streamed
    let canvas = Object.assign(document.createElement("canvas"), { width, height })
    //fills a blank rect
    canvas.getContext('2d').fillRect(0, 0, width, height)
    let stream = canvas.captureStream()
    //disables the audio stream and return
    return Object.assign(stream.getVideoTracks()[0], { enabled: false })
}