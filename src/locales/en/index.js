// 英文翻譯:key = 中文原文(含 {變數}),value = 英文。各區塊分檔,避免互相衝突。
import game from './engine.js'
import data from './data.js'
import prologue from './prologue.js'
import coach from './coach.js'
import ui1 from './ui1.js'
import ui2 from './ui2.js'
import settings from './settings.js'
import extra from './extra.js'
import minor from './minor.js'
import shop from './shop.js'
import regions from './regions.js'
import lifestages from './lifestages.js'
import db from './db.js'
import ml from './ml.js'
import features from './features.js'

export default { ...game, ...data, ...prologue, ...coach, ...ui1, ...ui2, ...settings, ...extra, ...minor, ...shop, ...regions, ...lifestages, ...db, ...ml, ...features }
