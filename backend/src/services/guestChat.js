/**
 * 访客聊天服务
 * @author 内师智能体系统 (￣▽￣)ﾉ
 */

class GuestChatService {
  constructor() {
    // 学校基本信息
    this.schoolInfo = {
      name: '内江师范学院',
      englishName: 'Neijiang Normal University',
      address: '四川省内江市东桐路1124号',
      phone: '0832-2340666',
      postcode: '641100',
      founded: '1956年',
      motto: '明德博学，笃行创新',
      description: '内江师范学院是四川省人民政府举办的全日制普通本科院校，坐落于素有"千年绸都"美誉的内江市。学校创建于1956年，历经六十余年的建设与发展，已成为一所以教师教育为主，多学科协调发展的综合性师范院校。'
    };

    // 学院信息
    this.colleges = [
      { name: '文学院', majors: ['汉语言文学', '汉语国际教育', '秘书学'] },
      { name: '数学与信息科学学院', majors: ['数学与应用数学', '信息与计算科学'] },
      { name: '外国语学院', majors: ['英语', '商务英语'] },
      { name: '化学化工学院', majors: ['化学', '应用化学'] },
      { name: '计算机科学学院', majors: ['计算机科学与技术', '软件工程', '物联网工程'] },
      { name: '音乐学院', majors: ['音乐学', '音乐表演'] },
      { name: '美术学院', majors: ['美术学', '视觉传达设计', '环境设计'] },
      { name: '体育学院', majors: ['体育教育', '社会体育指导与管理'] },
      { name: '政法与历史学院', majors: ['历史学', '思想政治教育', '法学'] },
      { name: '管理学院', majors: ['工商管理', '财务管理', '行政管理'] },
      { name: '教育科学学院', majors: ['教育学', '学前教育', '小学教育'] }
    ];
  }

  /**
   * 获取访客问题的答案
   * @param {string} question - 用户问题
   * @returns {string} 回答内容
   */
  async getAnswer(question) {
    const q = question.toLowerCase().trim();

    // 意图识别
    const intent = this.detectIntent(q);

    switch (intent) {
      case 'greeting':
        return this.getGreetingAnswer();
      case 'school_intro':
        return this.getSchoolIntro();
      case 'majors':
        return this.getMajorsInfo();
      case 'address':
        return this.getAddressInfo();
      case 'environment':
        return this.getEnvironmentInfo();
      case 'admission':
        return this.getAdmissionInfo();
      case 'thanks':
        return this.getThanksAnswer();
      default:
        return this.getDefaultAnswer(question);
    }
  }

  /**
   * 意图识别
   */
  detectIntent(question) {
    // 问候
    if ( /^(你好|您好|嗨|hi|hello)/i.test(question) ) {
      return 'greeting';
    }

    // 学校介绍
    if ( /(介绍|简介|学校|内江师范|整体)/.test(question) ) {
      return 'school_intro';
    }

    // 专业/学院
    if ( /(专业|学院|系|学科|有什么专业)/.test(question) ) {
      return 'majors';
    }

    // 地址/位置
    if ( /(地址|位置|在哪|怎么去|交通)/.test(question) ) {
      return 'address';
    }

    // 环境相关
    if ( /(环境|风景|漂亮|美|校园)/.test(question) ) {
      return 'environment';
    }

    // 招生相关
    if ( /(招生|录取|分数|报考|志愿)/.test(question) ) {
      return 'admission';
    }

    // 感谢
    if ( /(谢谢|感谢|thank)/i.test(question) ) {
      return 'thanks';
    }

    return 'unknown';
  }

  /**
   * 问候回答
   */
  getGreetingAnswer() {
    return `👋 您好！欢迎来到内江师范学院！

我是智能助手小智，很高兴为您服务~ (￣▽￣)ﾉ

**我可以为您介绍：**
- 🏛️ 学校基本信息和历史
- 📚 专业设置和学院介绍
- 📍 学校地址和交通指南
- 🌸 校园环境和设施

💡 试试问我：**"介绍一下学校"** 或 **"学校有哪些专业"**`;
  }

  /**
   * 学校介绍
   */
  getSchoolIntro() {
    return `🏛️ **内江师范学院简介**

${this.schoolInfo.description}

**基本信息：**
- 📅 创建时间：${this.schoolInfo.founded}
- 📍 地址：${this.schoolInfo.address}
- 📞 电话：${this.schoolInfo.phone}
- 📮 邮编：${this.schoolInfo.postcode}

**办学特色：**
- 教师教育特色鲜明
- 多学科协调发展
- 应用型人才培养
- 产教融合深度推进

**校园文化：**
- 📜 校训：${this.schoolInfo.motto}
- 💫 校风：团结、勤奋、求实、创新

还有什么想了解的吗？(^_^)b`;
  }

  /**
   * 专业信息
   */
  getMajorsInfo() {
    let content = `📚 **专业设置**

内江师范学院设有${this.colleges.length}个二级学院：\n\n`;

    this.colleges.forEach((college, index) => {
      content += `**${index + 1}. ${college.name}**\n`;
      content += `专业：${college.majors.join('、')}\n\n`;
    });

    content += `💡 **提示：** 具体的专业介绍、课程设置、就业前景等信息，建议访问学校官网或咨询相关专业老师。

欢迎报考内江师范学院！🎓`;

    return content;
  }

  /**
   * 地址信息
   */
  getAddressInfo() {
    return `📍 **学校位置**

**详细地址：**
${this.schoolInfo.address}

**交通指南：**
- 🚂 **火车：** 内江站下车，乘坐公交或出租车约15分钟
- 🚌 **汽车：** 内江客运中心下车，转乘公交或出租车约10分钟
- ✈️ **飞机：** 成都双流机场，转乘高铁或大巴约1.5小时

**联系方式：**
- 📞 电话：${this.schoolInfo.phone}
- 📮 邮编：${this.schoolInfo.postcode}

欢迎实地参观！🎓`;
  }

  /**
   * 环境信息
   */
  getEnvironmentInfo() {
    return `🌸 **校园环境**

内江师范学院校园环境优美，是学习和生活的理想场所！

**校园特色：**
- 🏞️ 绿化覆盖率高，四季常青
- 🌸 樱花、桂花等花卉点缀校园
- 📚 现代化的图书馆和教学设施
- 🏃‍♀️ 完善的体育场馆和设施
- 🍱 干净整洁的学生食堂

**生活设施：**
- 🏠 舒适的学生宿舍（空调、独立卫浴）
- 🍜 多样化的食堂餐饮
- 🏪 便利的校园超市
- 💻 全校WiFi覆盖

**学习环境：**
- 📖 图书馆藏书丰富
- 💻 多媒体教室
- 🔬 先进的实验室
- 安静自习区

欢迎来校参观体验！(￣▽￣)ﾉ`;
  }

  /**
   * 招生信息
   */
  getAdmissionInfo() {
    return `📝 **招生信息**

**招生咨询：**
- 📞 招生办电话：${this.schoolInfo.phone}
- 🌐 学校官网：www.njtc.edu.cn
- 📮 招生邮箱：zsb@njtc.edu.cn

**报考建议：**
1. 📊 参考往年录取分数线（官网可查）
2. 🎯 根据自己的兴趣和特长选择专业
3. 📚 了解专业培养方案和课程设置
4. 💼 关注就业前景和发展方向

**温馨提示：**
具体的招生计划、录取分数线、报考要求等信息，请以当年官方公布为准。

祝您金榜题名！🎓`;
  }

  /**
   * 感谢回答
   */
  getThanksAnswer() {
    return `😊 不客气！很高兴能帮助到您！

如果还有其他问题，随时可以问我哦~ (￣▽￣)ﾉ

**常用问题：**
- 📚 "介绍一下学校"
- 🎓 "有哪些专业"
- 📍 "学校地址在哪"
- 🌸 "校园环境怎么样"

期待您的提问！(^_^)b`;
  }

  /**
   * 默认回答
   */
  getDefaultAnswer(question) {
    return `😊 感谢您的提问！

关于"${question}"这个问题，我可能无法提供详细信息。

**您可以：**
1. 💬 **继续提问**关于学校的基本信息
2. 🔑 **登录系统**使用完整的智能助手功能
3. 📞 **致电学校** ${this.schoolInfo.phone} 获取准确信息
4. 🌐 **访问官网** www.njtc.edu.cn 查看详细信息

还有什么我可以帮您的吗？(￣▽￣)ﾉ`;
  }
}

// 导出单例
module.exports = new GuestChatService();
