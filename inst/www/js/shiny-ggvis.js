/*jshint forin:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true,
    strict:false, undef:true, unused:true, browser:true, jquery:true, maxerr:50,
    curly:false, multistr:true */
/*global Shiny, ggvis, vg*/
$(function(){ //DOM Ready

  var ggvisOutputBinding = new Shiny.OutputBinding();
  $.extend(ggvisOutputBinding, {
    find: function(scope) {
      return $(scope).find('.shiny-ggvis-output');
    },
    onValueError: function(el, err) {
      Shiny.unbindAll(el);
      this.renderError(el, err);
    },
    renderValue: function(el, data) {
      vg.parse.spec(data.spec, function(chart) {
        chart({el: el}).update({duration: 250});
      });
    }
  });
  Shiny.outputBindings.register(ggvisOutputBinding, 'shiny.ggvisOutput');

  // Receive data object and dispatch to appropriate vega object
  Shiny.addCustomMessageHandler("ggvis_data", function(message) {
    var plotId = message.plotId;
    var name = message.name;
    var data = message.value[0].values;
    var format = message.value[0].format;

    var plot = ggvis.getPlot(plotId);

    if (plot.chart) {
      // If the plot exists already, feed it the data
      var dataset = {};

      dataset[name] = vg.data.read(data, format);
      plot.chart.data(dataset);

      // If all data objects have been received, update.
      if (plot.data_ready()) {
        var opts = {};
        // Only use duration if plot already initialized (otherwise will error)
        if (plot.initialized) opts.duration = 250;

        plot.chart.update(opts);
        plot.updateGgvisDivSize();
        plot.initialized = true;
      }
    } else {
      // The plot doesn't exist, save the data for when the plot arrives
      if (!plot.pendingData)
        plot.pendingData = {};

      plot.pendingData[name] = data;
    }
  });


  // Receive a vega spec and parse it
  Shiny.addCustomMessageHandler("ggvis_vega_spec", function(message) {
    var plotId = message.plotId;
    var spec = message.spec;

    // If no renderer already selected, set it here
    if (!ggvis.renderer) {
      ggvis.renderer = message.renderer || "canvas";
      ggvis.setRendererChooser(ggvis.renderer);
      ggvis.updateDownloadButtonText();
    }

    var plot = ggvis.getPlot(plotId);

    plot.parseSpec(spec, ggvis.renderer,
      { mouseover: tooltip.mouseover, mouseout: tooltip.mouseout }
    );
  });


  // Callback functions when hovering
  var tooltip = {
    mouseover: function(event, item) {
      Shiny.onInputChange("ggvis_hover",
        { data: item.datum.data,
          pagex: event.pageX,
          pagey: event.pageY }
      );
    },

    mouseout: function(event, item) {
      Shiny.onInputChange("ggvis_hover", null);
    }
  };

  // Tooltip message handler
  Shiny.addCustomMessageHandler('ggvis_tooltip', function(data) {
    if (data.visible) {
      // Remove any existing tooltips
      $('.ggvis-tooltip').remove();

      // Add the tooltip div
      var $el = $('<div id="ggvis-tooltip" class="ggvis-tooltip"></div>')
        .appendTo('body');

      $el.html(data.html);
      $el.css({
        left:  data.pagex,
        top:   data.pagey,
        display: "block"
      });

    } else {
      $('.ggvis-tooltip').remove();
    }
  });

});
