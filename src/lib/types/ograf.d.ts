import { ServerApi } from 'ograf'

export type GraphicInstanceLoadResponse =
    ServerApi.paths['/renderers/{rendererId}/target/graphicInstance/load']['post']['responses']['200']['content']['application/json']
