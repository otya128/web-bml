// RFC2068 7.1 Entity Header Fields
// 
// entity-header  = Allow                    ; Section 14.7
//                | Content-Base             ; Section 14.11
//                | Content-Encoding         ; Section 14.12
//                | Content-Language         ; Section 14.13
//                | Content-Length           ; Section 14.14
//                | Content-Location         ; Section 14.15
//                | Content-MD5              ; Section 14.16
//                | Content-Range            ; Section 14.17
//                | Content-Type             ; Section 14.18
//                | ETag                     ; Section 14.20
//                | Expires                  ; Section 14.21
//                | Last-Modified            ; Section 14.29
//                | extension-header


// 2.2 Basic Rules

// DIGIT          = <any US-ASCII digit "0".."9">
function isDIGIT(char: number) {
    return char >= 48 && char <= 57;
}
// CTL            = <any US-ASCII control character
//                  (octets 0 - 31) and DEL (127)>
function isCTL(char: number) {
    return char === 127 || (char >= 0 && char <= 31);
}
// CR             = <US-ASCII CR, carriage return (13)>
function isCR(char: number) {
    return char === 13;
}
// LF             = <US-ASCII LF, linefeed (10)>
function isLF(char: number) {
    return char === 10;
}
// SP             = <US-ASCII SP, space (32)>
function isSP(char: number) {
    return char === 32;
}
// HT             = <US-ASCII HT, horizontal-tab (9)>
function isHT(char: number) {
    return char === 9;
}

// tspecials      = "(" | ")" | "<" | ">" | "@"
//                | "," | ";" | ":" | "\" | <">
//                | "/" | "[" | "]" | "?" | "="
//                | "{" | "}" | SP | HT
function isTSpecials(char: number) {
    return "()<>@,;:\\\"/[]?={} \t".indexOf(String.fromCharCode(char)) !== -1;
}


export type FieldValue = {
    type: "lws" | "quoted" | "tspecials" | "token",
    value: string
};

export function entityHeaderToString(header: EntityHeader) {
    return header.value.map(x => x.value).join("");
}

export type EntityHeader = {
    name: string,
    originalName: string,
    value: FieldValue[],
};

export type Entity = {
    headers: EntityHeader[],
    body: Buffer,
    multipartBody: Entity[] | null,
}

export class EntityParser {
    buffer: Buffer;
    _offset: number;
    set offset(v: number) {
        this._offset = v;
    }
    get offset(): number {
        return this._offset;
    }
    public constructor(buffer: Buffer) {
        this.buffer = buffer;
        this._offset = 0;
    }
    // STD-B24 第二分冊 (1/2) 第二編 第9章参照
    // module           = *entity-header
    //                    CRLF
    //                    [entity-body]
    public readEntity(): Entity | null {
        const headers: EntityHeader[] = [];
        while (true) {
            if (this.offset + 1 >= this.buffer.length) {
                return null;
            }
            if (isCR(this.buffer[this.offset]) && isLF(this.buffer[this.offset + 1])) {
                this.offset += 2;
                break;
            }
            const header = this.readEntityHeader();
            if (this.offset + 1 < this.buffer.length && isCR(this.buffer[this.offset]) && isLF(this.buffer[this.offset + 1])) {
                this.offset += 2;
            } else {
                return null;
            }
            if (header != null) {
                headers.push(header);
            } else {
                break;
            }
        }
        const contentType = headers.find(x => x.name === "content-type");
        let multipartBody = null;
        if (contentType != null && contentType.name === "content-type") {
            const mediaType = parseMediaType(contentType.value);
            if (mediaType != null && mediaType.type === "multipart" && mediaType.subtype === "mixed") {
                multipartBody = this.readMultipartEntityBody(mediaType);
            }
        }
        return { headers, body: this.buffer.subarray(this.offset), multipartBody };
    }

    // multipartの場合
    // STD-B24 第二分冊 (1/2) 第二編 第9章, RFC1945参照
    // RFC1521
    // entity-body      = discard-text 1*encapsulation
    //                    close-delimiter discard-text
    // discard-text     = *(*text CRLF)

    // multipart-body := preamble 1*encapsulation
    //                close-delimiter epilogue

    // encapsulation := delimiter body-part CRLF

    // 0以上69以下のbchars
    // boundary := 0*69<bchars> bcharsnospace

    // bchars := bcharsnospace / " "

    // bcharsnospace :=    DIGIT / ALPHA / "'" / "(" / ")" / "+" /"_"
    //               / "," / "-" / "." / "/" / ":" / "=" / "?"

    // delimiter := "--" boundary CRLF ; taken from Content-Type field.
    //                                 ; There must be no space
    //                                 ; between "--" and boundary.
    // close-delimiter := "--" boundary "--" CRLF ; Again, no space
    // preamble := discard-text   ;  to  be  ignored upon receipt.
    // epilogue := discard-text   ;  to  be  ignored upon receipt.

    // body-part := <"message" as defined in RFC 822,
    //           with all header fields optional, and with the
    //           specified delimiter not occurring anywhere in
    //           the message body, either on a line by itself
    //           or as a substring anywhere.  Note that the
    //           semantics of a part differ from the semantics
    //           of a message, as described in the text.>



    // by "--",

    // entity-body      = discard-text 1*encapsulation
    //                    close-delimiter discard-text
    // discard-text     = *(*text CRLF)
    // encapsulation    = delimiter body-part CRLF
    // delimiter        = "--" boundary CRLF
    // body-part        = *entity-header
    //                    CRLF
    //                    [entity-body]
    // close-delimiter  = "--" boundary "--" CRLF
    readMultipartEntityBody(mediaType: MediaType): Entity[] | null {
        const boundaryParameter = mediaType.parameters.find(x => x.attribute === "boundary");
        if (boundaryParameter == null) {
            return null;
        }
        const boundary = boundaryParameter.value;
        const delimiter = "--" + boundary + "\r\n";
        const closeDelimiter = "--" + boundary + "--\r\n";
        // delimiterまでdiscard-text
        // entity-body      = discard-text 1*encapsulation
        //                    close-delimiter discard-text
        // encapsulation := delimiter body-part CRLF
        const entites: Entity[] = [];
        let isLast = false;
        while (!isLast) {
            const bodyPartOffset = this.buffer.indexOf(delimiter, this.offset);
            if (bodyPartOffset !== -1) {
                this.offset = bodyPartOffset + delimiter.length;
                // delimiter body-part CRLF [delimiter body-part CRLF [delimiter body-part CRLF...]]
                let nextBodyPartOffset = this.buffer.indexOf("\r\n" + delimiter, this.offset);
                if (nextBodyPartOffset === -1) {
                    nextBodyPartOffset = this.buffer.indexOf("\r\n" + closeDelimiter, this.offset);
                    if (nextBodyPartOffset === -1) {
                        return null;
                    }
                    isLast = true;
                    this.offset = nextBodyPartOffset + "\r\n".length + closeDelimiter.length;
                } else {
                    this.offset = nextBodyPartOffset + "\r\n".length;
                }
                const bodyPart = this.buffer.subarray(bodyPartOffset + delimiter.length, nextBodyPartOffset);
                const parser = new EntityParser(bodyPart);
                const entity = parser.readEntity();
                if (entity == null) {
                    return null;
                }
                entites.push(entity);
            } else {
                return null;
            }
        }
        this.offset = this.buffer.length;
        return entites;
    }
    // field-name     = token
    // field-value    = *( field-content | LWS )
    //
    // field-content  = <the OCTETs making up the field-value
    //                  and consisting of either *TEXT or combinations
    //                  of token, tspecials, and quoted-string>

    // RFC2068 4.2 Message Headers
    // extension-header = message-header
    // message-header = field-name ":" [ field-value ] CRLF
    readEntityHeader(): EntityHeader | null {
        const fieldName = this.readToken();
        if (fieldName == null) {
            return null;
        }
        this.readImpliedLWS();
        if (this.offset >= this.buffer.length || this.buffer[this.offset] !== ":".charCodeAt(0)) {
            return null;
        }
        this.offset++;
        this.readImpliedLWS();
        const lowerFieldName = fieldName.toLowerCase();
        return { name: lowerFieldName, originalName: fieldName, value: this.readFieldValue() };
    }
    readFieldValue(): FieldValue[] {
        const values: FieldValue[] = [];
        while (this.offset < this.buffer.length) {
            if (this.readLWS()) {
                this.readImpliedLWS();
                values.push({ type: "lws", value: " " });
                continue;
            }
            const char = this.buffer[this.offset];
            const quoted = this.readQuotedString();
            if (quoted != null) {
                values.push({ type: "quoted", value: quoted });
                continue;
            }
            if (isTSpecials(char)) {
                values.push({ type: "tspecials", value: String.fromCharCode(char) });
                this.offset++;
                continue;
            }
            const token = this.readToken();
            if (token == null) {
                break;
            }
            values.push({ type: "token", value: token });
        }
        return values;
    }
    // token          = 1*<any CHAR except CTLs or tspecials>
    //
    public readToken(): string | null {
        const beginOffset = this.offset;
        for (; this.offset < this.buffer.length; this.offset++) {
            if (isCTL(this.buffer[this.offset]) || isTSpecials(this.buffer[this.offset])) {
                break;
            }
        }
        if (this.offset === beginOffset) {
            return null;
        }
        return this.buffer.toString("ascii", beginOffset, this.offset);
    }
    readImpliedLWS() {
        while (this.readLWS()) { }
    }
    // CRLF           = CR LF
    // LWS            = [CRLF] 1*( SP | HT )
    readLWS(): boolean {
        const char = this.buffer[this.offset];
        if (isCR(char) && this.offset + 2 < this.buffer.length) {
            if (isLF(this.buffer[this.offset + 1])) {
                if (isSP(this.buffer[this.offset + 2]) || isHT(this.buffer[this.offset + 2])) {
                    this.offset += 2;
                }
            }
        }
        if (isSP(this.buffer[this.offset]) || isHT(this.buffer[this.offset])) {
            while (this.offset < this.buffer.length && isSP(this.buffer[this.offset]) || isHT(this.buffer[this.offset])) {
                this.offset++;
            }
            return true;
        }
        return false;
    }
    // TEXT           = <any OCTET except CTLs,
    //                  but including LWS>
    readText(): string {
        const result: number[] = [];
        for (; this.offset < this.buffer.length; this.offset++) {
            const char = this.buffer[this.offset];
            // HTTP/1.0 headers may be folded onto multiple lines if each
            // continuation line begins with a space or horizontal tab. All linear
            // whitespace, including folding, has the same semantics as SP.
            if (this.readLWS()) {
                this.readImpliedLWS();
                result.push(0x20);
                continue;
            }
            if (isCTL(char)) {
                break;
            }
            result.push(char);
        }
        return Buffer.from(result).toString("ascii");
    }
    // qdtext         = <any TEXT except <">>
    readQdText(): string {
        const result: number[] = [];
        for (; this.offset < this.buffer.length; this.offset++) {
            const char = this.buffer[this.offset];
            // HTTP/1.0 headers may be folded onto multiple lines if each
            // continuation line begins with a space or horizontal tab. All linear
            // whitespace, including folding, has the same semantics as SP.
            if (this.readLWS()) {
                this.readImpliedLWS();
                result.push(0x20);
                continue;
            }
            if (isCTL(char)) {
                break;
            }
            // RFC
            // The backslash character ("\") may be used as a single-character quoting
            // mechanism only within quoted-string and comment constructs.
            //
            // quoted-pair    = "\" CHAR
            if (char === 0x5c) {
                if (this.offset + 1 < this.buffer.length) {
                    this.offset++;
                    result.push(this.buffer[this.offset]);
                }
                continue;
            }
            if (char === 0x22) {
                break;
            }
            result.push(char);
        }
        return Buffer.from(result).toString("ascii");
    }
    // quoted-string  = ( <"> *(qdtext) <"> )
    readQuotedString(): string | null {
        if (this.buffer[this.offset] !== 34) {
            return null;
        }
        this.offset++;
        const texts: string[] = [];
        while (this.offset < this.buffer.length && this.buffer[this.offset] !== 34) {
            texts.push(this.readQdText());
        }
        if (this.buffer[this.offset] === 34) {
            this.offset++;
        }
        return texts.join("");
    }
    // 3.7 Media Types
    // media-type     = type "/" subtype *( ";" parameter )
    // type           = token
    // subtype        = token
    // parameter      = attribute "=" value
    // attribute      = token
    // value          = token | quoted-string
    // > The type, subtype, and parameter attribute names are case-insensitive.  Parameter values may or may not be case-sensitive, depending on the semantics of the parameter name
    // > Linear white space (LWS) MUST NOT be used between the type and subtype, nor between an attribute and its value.
    readMediaType(): MediaType | null {
        const type = this.readToken();
        if (type == null) {
            return null;
        }
        if (this.offset >= this.buffer.length || this.buffer[this.offset] !== "/".charCodeAt(0)) {
            return null;
        }
        this.offset++;
        const subtype = this.readToken();
        if (subtype == null) {
            return null;
        }
        const parameters: MediaTypeParameter[] = [];
        this.readImpliedLWS();
        while (this.offset < this.buffer.length && this.buffer[this.offset] === ";".charCodeAt(0)) {
            this.offset++;
            const parameter = this.readMediaTypeParameter();
            if (parameter == null) {
                return null;
            }
            parameters.push(parameter);
        }
        return { type: type.toLowerCase(), originalType: type, subtype: subtype.toLowerCase(), originalSubtype: subtype, parameters };
    }
    readMediaTypeParameter(): MediaTypeParameter | null {
        const attribute = this.readToken();
        if (attribute == null) {
            return null;
        }
        if (this.offset >= this.buffer.length || this.buffer[this.offset] !== "=".charCodeAt(0)) {
            return null;
        }
        this.offset++;
        const value = this.readQuotedString() ?? this.readToken();
        if (value == null) {
            return null;
        }
        return { attribute: attribute.toLowerCase(), originalAttribute: attribute, value };
    }
}
// 3.7 Media Types
// media-type     = type "/" subtype *( ";" parameter )
// type           = token
// subtype        = token
// parameter      = attribute "=" value
// attribute      = token
// value          = token | quoted-string
// > The type, subtype, and parameter attribute names are case-insensitive.  Parameter values may or may not be case-sensitive, depending on the semantics of the parameter name
// > Linear white space (LWS) MUST NOT be used between the type and subtype, nor between an attribute and its value.
export function parseMediaType(tokens: FieldValue[]): MediaType | null {
    let offset = 0;
    const type = tokens[offset];
    if (type?.type !== "token") {
        return null;
    }
    offset++;
    if (tokens[offset]?.type !== "tspecials" || tokens[offset]?.value !== "/") {
        return null;
    }
    offset++;
    const subtype = tokens[offset];
    if (type?.type !== "token") {
        return null;
    }
    offset++;
    const parameters: MediaTypeParameter[] = [];
    if (tokens[offset]?.type == "lws") {
        offset++;
    }
    function parseMediaTypeParameter(): MediaTypeParameter | null {
        const attribute = tokens[offset];
        if (attribute == null) {
            return null;
        }
        offset++;
        if (tokens[offset]?.type !== "tspecials" || tokens[offset]?.value !== "=") {
            return null;
        }
        offset++;
        const value = tokens[offset];
        if (value?.type !== "token" && value?.type !== "quoted") {
            return null;
        }
        offset++;
        return { attribute: attribute.value.toLowerCase(), originalAttribute: attribute.value, value: value.value };
    }
    while (tokens[offset]?.value === ";" && tokens[offset]?.type === "tspecials") {
        offset++;
        const parameter = parseMediaTypeParameter();
        if (parameter == null) {
            return null;
        }
        parameters.push(parameter);
    }
    return { type: type.value.toLowerCase(), originalType: type.value, subtype: subtype.value.toLowerCase(), originalSubtype: subtype.value, parameters };
}
export type MediaType = {
    type: string,
    originalType: string,
    subtype: string,
    originalSubtype: string,
    parameters: MediaTypeParameter[],
};

export type MediaTypeParameter = {
    attribute: string,
    originalAttribute: string,
    value: string,
};

