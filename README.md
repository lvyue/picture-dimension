# picture-dimensionjs  

本模块用于在前端识别图片文件类型以及获取文件dimension信息.



## Install

```bash  

# npm
npm install picture-dimensionjs

# yarn 
yarn add picture-dimensionjs

```

## Use
```js
// In React
import React from 'react';
import dimension from 'picture-dimensionjs';

const Upload = () => {
    return <input type="file" onChange={ e => {
            const {files} = e.currentTarget
            if (files && files.length > 0) {
                dimension(files[f]).then( dim => {
                    console.log('dimension:', dim)
                })
            }
        } 
    }>
}

```

```html
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>example</title>
        <script src="../lib/index.umd.js"></script>
    </head>
    <body>
        <input type="file" id="file">
        <div id="result"></div>
        <script>
            const input  = document.querySelector('#file');
            const result  = document.querySelector('#result');
            input.addEventListener('change',(e) => {
                const {files} = e.target;
                if (files) {
                    const f = files[0];
                    PictureDimension(f).then((info)=> {
                        result.innerHTML = `<p>${JSON.stringify(info)}</p>`
                    });
                }
            })
        </script>
    </body>
</html>

```


## Developer  

1. clone project and install dependence

```bash
# clone project
git clone https://github.com/lvyue/picture-dimension.git <your_project>
#
cd <your_project>
# install dependence
npm install 

```

2. build lib and start serve

```bash
# build package
npm build
# start serve
npm serve

```

3. open [http://localhost:3002/example](http://localhost:3002/example) in browser


