// 读取数据大小
const blockSize = 64;

export interface Dimensions {
    ext: ''|'PNG'|'JPG'|'GIF'|'BMP';
    width: number;
    height: number;
}


const IMAGE_HEAD_SIGS = {
    GIF: [0x47, 0x49, 0x46], //'G' 'I' 'F' ascii
    PNG: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    JPG: [0xff, 0xd8, 0xff, 0xe0],
    BMP: [0x42, 0x4d]
}


function readUint32BE(bytes: Uint8Array, start: number) {
    var uarr = new Uint32Array(1);
    uarr[0] = (bytes[start + 0] & 0xFF) << 24
    uarr[0] = uarr[0] | ((bytes[start + 1] & 0xFF) << 16)
    uarr[0] = uarr[0] | ((bytes[start + 2] & 0xFF) << 8)
    uarr[0] = uarr[0] | (bytes[start + 3] & 0xFF)
    return uarr[0]
}

function readUint16BE(bytes: Uint8Array, start: number) {
    var uarr = new Uint32Array(1);
    uarr[0] = (bytes[start + 0] & 0xFF) << 8;
    uarr[0] = uarr[0] | (bytes[start + 1] & 0xFF);
    return uarr[0];
}

//LE [0x01,0x02,0x03,0x04] -> 0x04030201
function readUint32LE(bytes: Uint8Array, start: number) {
    var uarr = new Uint32Array(1);
    uarr[0] = (bytes[start + 3] & 0xFF) << 24
    uarr[0] = uarr[0] | ((bytes[start + 2] & 0xFF) << 16)
    uarr[0] = uarr[0] | ((bytes[start + 1] & 0xFF) << 8)
    uarr[0] = uarr[0] | (bytes[start + 0] & 0xFF)
    return uarr[0]
}

function readUint16LE(bytes: Uint8Array, start: number) {
    var uarr = new Uint32Array(1);
    uarr[0] = (bytes[start + 1] & 0xFF) << 8;
    uarr[0] = uarr[0] | (bytes[start + 0] & 0xFF);
    return uarr[0];
}

function readBlob(input:Blob, offset:number, end: number):Promise<Uint8Array|null> {
    return new Promise((resole,reject) => {
        const fr = new FileReader();

        fr.onload = function () {
            const {result} = fr;
            if (result) {
                return resole(new Uint8Array(result as ArrayBuffer));
            }
            resole(null);
        }
        fr.onerror = reject;
        // 读取数据
        fr.readAsArrayBuffer(input.slice(offset, end))
    })
}

function readJPG(input:Blob, bufferOffset:number, bytes: Uint8Array, dim:Dimensions, byteOffset:number = 0): Promise<Dimensions> {
    let offset = 0;
    const M_SOF0 = 0xC0; /* Start Of Frame N */
    const M_SOF1 = 0xC1; /* N indicates which compression process */
    const M_SOF2 = 0xC2; /* Only SOF0-SOF2 are now in common use */
    const M_SOF3 = 0xC3;
    const M_SOF5 = 0xC5; /* NB: codes C4 and CC are NOT SOF markers */
    const M_SOF6 = 0xC6;
    const M_SOF7 = 0xC7;
    const M_SOF9 = 0xC9;
    const M_SOF10 = 0xCA;
    const M_SOF11 = 0xCB;
    const M_SOF13 = 0xCD;
    const M_SOF14 = 0xCE;
    const M_SOF15 = 0xCF;
    outer:for (let i = byteOffset; i < bytes.length; i++) {
        if (bytes[i] === 0xFF) {
            // 判断当前是否是最后一个区间
            if (i + 1 === bytes.length) {
                offset = i;
                break;
            }
            switch (bytes[i + 1]) {
                case M_SOF0:
                case M_SOF1:
                case M_SOF2:
                case M_SOF3:
                case M_SOF5:
                case M_SOF6:
                case M_SOF7:
                case M_SOF9:
                case M_SOF10:
                case M_SOF11:
                case M_SOF13:
                case M_SOF14:
                case M_SOF15:
                    {
                        if (bytes.length > i + 9) {
                            //高在前，宽在后。
                            dim.width = readUint16BE(bytes, i + 7)
                            dim.height = readUint16BE(bytes, i + 5)
                            offset = 0;
                            break outer;
                        }
                        offset = i;
                        break outer;
                    }
                default:
                    offset = i;
                    break;
            }
        }else {
            offset = i;
        }
    }
    if (offset === 0) {
        return Promise.resolve(dim);
    }
    let end = Math.min(input.size, bufferOffset + blockSize);
    if (bufferOffset === end) {
        return Promise.resolve(dim);
    }
    return readBlob(input,bufferOffset,end).then((chunk)=>{
        if (!chunk){
            return dim;
        }
        const sub = bytes.subarray(offset);
        const n = new Uint8Array(sub.length + chunk.length);
        n.set(sub);
        n.set(chunk,sub.length);
        return readJPG(input, end, n, dim);
    })
}


/**
 * 分析文件数据
 * @param input 
 * @param dim 
 * @param offset 偏移量
 */
function read(input:Blob, dim:Dimensions, offset: number = 0): Promise<Dimensions> {
    let end = Math.min(input.size, offset + blockSize);
    if (offset ===end) {
        return Promise.resolve(dim);
    }
    return readBlob(input, offset, end).then((bytes)=>{
        if (!bytes){
            return dim;
        }
            // png
        if (bytes.slice(0, 8).toString() === IMAGE_HEAD_SIGS.PNG.toString()) {
            dim.ext = "PNG";
            dim.width = readUint32BE(bytes, 16);
            dim.height = readUint32BE(bytes, 20);
            return dim;
        // bmp
        } else if (bytes.slice(0, 2).toString() === IMAGE_HEAD_SIGS.BMP.toString()) {
            //虽然格式为4字节，这里只取2字节，确保height为正数。为负数时，图像为倒置图像。
            dim.ext = "BMP";
            dim.height = readUint16LE(bytes, 22);
            dim.width = readUint16LE(bytes, 18);
            return dim
        // gif
        } else if (bytes.slice(0, 3).toString() === IMAGE_HEAD_SIGS.GIF.toString()) {
            dim.ext = 'GIF';
            dim.width = readUint16LE(bytes, 6);
            dim.height = readUint16LE(bytes, 8);
            // return { width, height }
            return dim
            // jpg
        } else if (bytes.slice(0, 4).toString() === IMAGE_HEAD_SIGS.JPG.toString()) {
            dim.ext = "JPG"
            return readJPG(input, end, bytes, dim,  0);
        }else {
            return dim;
        }
    })
}

export default function dimensions (input:Blob):Promise<Dimensions> {
    const dim:Dimensions = { ext:"", width:NaN, height:NaN};
    if (input.size === 0) {
        return Promise.resolve(dim);
    }
    return read(input,dim);
}